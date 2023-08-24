import torch 
import torch.nn as nn
from torch.nn import functional as F
from . import core as M
from . import list_lr as lr
import copy

nnList = dir(nn)


# Not Merge Model
class MainModel(nn.Module):
    """
        Model that made by user
        
        Args:
            - info(json or dict) : information that about model from platform
            - insize(int) : input size
            - outseq(int) : output sequence number
    """
    def __init__(self,info,outseq):
        super(MainModel,self).__init__()
        # self.insize = insize
        self.outseq = outseq
        
        modules = []
        # layer type e.g.) Linear, Conv1d
        for idx, layer in enumerate(info):
            # check model(type) in torch.nn package
            if layer['type'] in nnList:
                # Load torch Layer
                m = getattr(nn, layer['type'])

                """
                =================Transpose except=================
                    In Conv, Recurrent Layer Case, have to transpose shape
                    Recurrent (N,L,H) ==> (N,H,L) Conv
                         Conv (N,H,L) ==> (N,L,H) Recurrent
                    
                    In list_lr:
                        (1)       list_lr_order ==> list_lr_order_trans
                        (2) list_lr_order_trans ==> list_lr_order

                    * transpose_tensor
                        - transpose the order of tensor dim1, dim2
                        tensor(0,1,2) ==> tensor(0,2,1)
                """

                """
                =================Recurrent Layer except=================
                    In Recurrent Layer case, return output and hidden, cell states (h_n, c_n)
                        => outputs : output,(h_n, c_n)
                    need to processing output according to the following layer.

                    e.g.
                        Recurrent Layer ==> conv -----> return output
                        Recurrent Layer ==> 1d   -----> return last one output 

                    * GetToOutput
                        - get Recurrent Layer's Output
                    
                    * extract_tensor
                        - get Recurrent Layer's last one Output
                        - return tensor[:,-1,:]

                """
                """
                =================Input Shape Process=================
                    The first Layer, need to set input size as input datas
                    and Other Layer that need info of input size, get arg name(ex. in_feature, in_channels) and set size


                """
                # Transpose except(2)
                if idx!=0 and info[idx-1]['type'] in lr.list_lr_order_trans:
                    if layer['type'] in lr.list_lr_order:
                        tm = getattr(M, 'transpose_tensor')
                        modules.append(tm())

                # before layer is Recurrent Layer get before layer's output
                elif idx!=0 and info[idx-1]['type'] in lr.list_lr_order:
                    # now layer need to get Recurrent Layer's whole output  
                    if layer['type'] in lr.list_lr_2d:
                        # extract output module append
                        # Recurrent Layer => dim Layer(ex Conv, LSTM...)
                        tm = getattr(M, 'GetToOutput')
                        modules.append(tm())
                    
                    # Transpose except(1)
                    elif layer['type'] in lr.list_lr_order_trans:
                        tm = getattr(M, 'transpose_tensor')
                        modules.append(tm())

                    # if not, get last result output
                    else:
                        tm = getattr(M,'extract_tensor')
                        modules.append(tm())

                """
                =================Append arg except=================
                    This Exception is Append Layer argument 
                        for Recurrent Layer and Layer that need info about input size
                    
                    (1) Append batch_first
                        as same Transpose except, layer that in list_lr_order(Recurrent Layer) need a argument 'batch_first'
                        'batch_first' argument is change Input shape
                            if True : (N,L,H)
                            if False : (L,N,H)
                        for nier AI platform system, need to fix 'batch_first = True'

                    (2) Append Input size
                        in some layer, need arg of input shape size (e.g. in_features, in_channels...)
                        save this case in list_lr_feature in './engine/list_lr.py'
                        in this case, load argument name and set input size

                        + except plus 
                            + In Recurrent Layer case, arguments like
                                (self, *args, **kwargs) 
                              the input argument name is 'input_size' that same RNN, GRU, LSTM (Recurrent Layer, lr.list_lr_order)
                              so, if layer is Recurrent Layer, set input argument name 'input_size'

                        ex)
                            m = getattr(nn, layer['type'])
                            input_arg = list(m.__init__.__code__.co_varnames)[1]
                        
                """

                append_arg = {}

                # Now layer is Recurrent Layer
                # append arg except(1)
                if layer['type'] in lr.list_lr_order:
                    # In Recurrent Layer case, have to fix batch_first=True
                    append_arg['batch_first'] = True
                    # modules.append(m(**layer['arg'],**append_arg))

                # Input Size append
                # Now layer need input shape size
                # append arg except(2)
                if layer['type'] in lr.list_lr_feature:
                    input_arg = 'input_size' if layer['type'] in lr.list_lr_order else list(m.__init__.__code__.co_varnames)[1]
                    append_arg[input_arg] = layer['in']

                # same {**layer['arg'],**append_arg}, but if any of the two(layer['arg], append_arg) have the same arg, update to the latter(append_arg)
                layer['arg'].update(append_arg)

                """
                =================LazyLinear except=================
                    if append LazyLinear Layer, (e.g. Merge)
                    don't need layer arg, need output
                """
                # append layer
                if layer['type'] == 'LazyLinear':
                    modules.append(m(layer['out']))
                else:
                    modules.append(m(**layer['arg']))
                
                # If Recurrent Layer is Last Layer
                if layer['type'] in lr.list_lr_order and idx == len(info)-1:
                    tm = getattr(M,'extract_tensor')
                    modules.append(tm())
                    

            # if torch.nn not include layer, try include from 'core'
            else:
                try:
                    m = getattr(M,layer['type'])
                except AttributeError:
                    print('{} Layer가 존재하지 않습니다.'.format(layer['type']))
                else:
                    modules.append(m(**layer['arg']))

        self.seq = nn.Sequential(*modules)
        self.fc = nn.LazyLinear(self.outseq)


    def forward(self, x):
        out = self.seq(x)
        out = self.fc(out)
        return out



# Merge Model
class MergeModel(nn.Module):
    """
        Merge Model
        
        Args:
            - models(dict) : dict of models to combine
            - outseq(int) : output sequence number 
            - devide : torch.device that used in our system. this arg is required to make merge model on the same device

        models:
            models consist of 'cols', 'mers'

            cols:
                cols has 'key', 'list of layer'
                'key' is key value for merge model
            
            mers:
                mers is Merge layer info

        MergeModel make merged model using this process

        e.g.

                A       B
                |       |
                |_merge_|
                    |
                  output
                
        self.A = MainModel(cols['A'],outseq)
        self.B = MainModel(cols['B'],outseq)
        
        output = torch.concat(self.A,self.B)
          => now additional layer available layer is `linear`
          => new input size = outseq * 2

    """
    def __init__(self,models,outseq,device):
        super(MergeModel,self).__init__()
        self._layerList = models['cols']
        self._mergeList = models['mers']
        self.outseq = outseq
        self._device = device

        # Save Main Models
        self.models = {}

        # Make and SaveMain Models
        for key,layers in self._layerList.items():
            self.models[f'{key}'] = MainModel(layers,self.outseq).to(self._device)

        self.fc = nn.LazyLinear(self.outseq).to(self._device)
        

    def forward(self,xlist):
        """
        forward mechanism
            1) xlist
                in merge model, there are several main models.
                they need input each other, so MergeModel need to get each model's input
                xlist is list of input(torch) for each main models

            2) xs
                Save each Main Model's result using index(cols.key()),
                when some models merged, update the first index's value in xs to merge model's result
        """
        # Save Models result
        xs = {}
        for idx, (key,model) in enumerate(self.models.items()):
            xs[f'{key}'] = model(xlist[idx]).to(self._device)
        
        # info is information of merge
        for info in list(self._mergeList.values()):
            # merge_idx = layer index that to merge
            merge_idx = info['list_cols']
            # new index to save merge model's result
            new_key = merge_idx[0]

            # mxs = result to merge
            mxs = [xs[f'{i}'] for i in merge_idx]
            x = torch.cat(mxs,dim=1)

            # when merge model have following layer
            """
            
            """
            if info['following_sequential']:
                if info['following_sequential'][0]['type'] == 'Linear':
                    layers = copy.deepcopy(info['following_sequential'])
                    layers[0]['type'] = 'LazyLinear'
                    # info['following_sequential'][0]['type'] = 'LazyLinear'
                    add_model = MainModel(layers,self.outseq).to(self._device)
                    x = add_model(x).to(self._device)
                else:
                    raise Exception('Merge Error : Merge Layer 아래는 Linear Layer만 추가할 수 있습니다.')

            
            xs[f'{new_key}'] = x
        
        x = self.fc(x)

        return x
        
