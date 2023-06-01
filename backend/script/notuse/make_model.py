import argparse, sys, os, re, json,pandas as pd, numpy as np 
sys.path.append('./')
nowpath = os.getcwd()

parser = argparse.ArgumentParser()
parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)
parser.add_argument('model_args', type=str)
args = parser.parse_args()

# dir_script = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name 

# #layer categories
# ###################################################################################################################################################################################################################################################################
# # ============================================================================= #
# #  Layer types need info of in_feature number
# list_lr_feature = ['Conv1d', 'Conv2d', 'Conv3d', 'ConvTranspose1d', 'ConvTranspose2d', 'ConvTranspose3d', #conv
#                'AdaptiveLogSoftmaxWithLoss',#activ
#                'BatchNorm1d', 'BatchNorm2d', 'BatchNorm3d', 'GroupNorm', 'SyncBatchNorm', 'InstanceNorm1d','InstanceNorm1d','InstanceNorm2d', 'InstanceNorm3d', #norm
#                'RNN', 'LSTM', 'GRU', 'RNNCell', 'LSTMCell', 'GRUCell', #rnn
#                'Linear' #linear
#                ]
# # ============================================================================= #
# #  Layer types change tensor length
# list_lr_length = ['Conv1d', 'Conv2d', 'Conv3d', 'ConvTranspose1d', 'ConvTranspose2d', 'ConvTranspose3d', #conv
#                   'MaxPool1d', 'MaxPool2d', 'MaxPool3d', 'MaxUnPool1d', 'MaxUnPool2d', 'MaxUnPool3d', 'AvgPool1d', 'AvgPool2d', 'AvgPool3d', 'FractionalMaxPool2d', 'FractionalMaxPool3d', 'LPPool1d', 'LPPool2d', 'AdaptiveMaxPool1d', 'AdaptiveMaxPool2d', 'AdaptiveMaxPool3d', 'AdaptiveAvgPool1d', 'AdaptiveAvgPool2d', 'AdaptiveAvgPool3d', #pool
#                   'ReflectionPad1d', 'ReflectionPad2d', 'ReflectionPad3d', 'ReplicationPad1d', 'ReplicationPad2d', 'ReplicationPad3d', 'ZeroPad2d', 'ConstantPad1d', 'ConstantPad2d', 'ConstantPad3d',#pad
#                   'RNN', 'LSTM', 'GRU', 'RNNCell', 'LSTMCell', 'GRUCell', #rnn
#                ]
# # ============================================================================= #
# #  Layer types change tensor dim
# list_lr_dim = ['Fold', 'Unfold', 'Flatten', 'Unflatten'
#                ]
# # ============================================================================= #
# #  Layer types different dim
# list_lr_2d = ['Conv1d', 'ConvTranspose1d', 'BatchNorm1d', 'InstanceNorm1d','MaxPool1d','MaxUnPool1d', 'AvgPool1d', 'RNN', 'LSTM',  'LSTMCell' #3D
#                 'Conv2d', 'ConvTranspose2d', 'BatchNorm2d', 'InstanceNorm2d', #4D
#                 'Conv3d', 'ConvTranspose3d', 'BatchNorm3d', 'InstanceNorm3d', #5D
#                 'SyncBatchNorm', #>2D
#                 ]
# # ============================================================================= #
# #  Layer types have an unique input order
# list_lr_order = ['RNN', 'LSTM',  'LSTMCell' #(N,L,H)
#                  ]
# '''
# 'Conv1d', 'ConvTranspose1d', 'BatchNorm1d', 'InstanceNorm1d', 'Conv2d', 'ConvTranspose2d', 'BatchNorm2d', 'InstanceNorm2d', 'Conv3d', 'ConvTranspose3d', 'BatchNorm3d', 'InstanceNorm3d', 'SyncBatchNorm',#(N,H,*)
# 'MaxPool1d', 'MaxPool2d', 'MaxPool3d', 'MaxUnPool1d', 'MaxUnPool2d', 'MaxUnPool3d', 'AvgPool1d', 'AvgPool2d', 'AvgPool3d', 'FractionalMaxPool2d', 'FractionalMaxPool3d', 'LPPool1d', 'LPPool2d', 'AdaptiveMaxPool1d', 'AdaptiveMaxPool2d', 'AdaptiveMaxPool3d', 'AdaptiveAvgPool1d', 'AdaptiveAvgPool2d', 'AdaptiveAvgPool3d',#(N,H,*)                
# 'ReflectionPad1d', 'ReflectionPad2d', 'ReflectionPad3d', 'ReplicationPad1d', 'ReplicationPad2d', 'ReplicationPad3d', 'ZeroPad2d', 'ConstantPad1d', 'ConstantPad2d', 'ConstantPad3d',#(N,H,*)
# 'Linear', 'GRUCell', 'RNNCell',#(N,H)
# '''
# # ============================================================================= #
# #generating list_cols and list_mers
# ###################################################################################################################################################################################################################################################################
# model_args = json.loads(args.model_args) #load model args from yj
# '''
# model_args = {
# "id":"admin",
# "prjname":"modeltest",
# "model":[
#     {"id":0,"newc":"Conv1d_1","column":0,"row":0,"data":{"out_channels":1,"kernel_size":1,"stride":1,"padding":0,"dilation":1,"groups":0,"bias":"True","padding_mode":"zeros"},"type":"Conv1d","del":0},
#     {"id":1,"newc":"Linear_1","column":1,"row":1,"data":{"out_features":1,"bias":"True"},"type":"Linear","del":1},
#     {"id":2,"newc":"Conv2d_1","column":2,"row":2,"data":{"out_channels":1,"kernel_size":1,"stride":1,"padding":0,"dilation":1,"groups":0,"bias":"True","padding_mode":"zeros"},"type":"Conv2d","del":2},
#     {"id":3,"newc":"Conv1d_2","column":3,"row":3,"data":{"out_channels":1,"kernel_size":1,"stride":1,"padding":0,"dilation":1,"groups":0,"bias":"True","padding_mode":"zeros"},"type":"Conv1d","del":3},
#     {"id":4,"newc":"Merge_1","column":4,"row":4,"data":{},"type":"Merge","del":4,"merge":[2,3]},
#     {"id":5,"newc":"Linear_2","column":5,"row":5,"data":{"out_features":1,"bias":"True"},"type":"Linear","del":5},
#     {"id":6,"newc":"Merge_2","column":6,"row":6,"data":{},"type":"Merge","del":6,"merge":[1,2]},
#     {"id":7,"newc":"Linear_3","column":7,"row":7,"data":{"out_features":1,"bias":"True"},"type":"Linear","del":7},
#     {"id":8,"newc":"Dropout_1","column":8,"row":8,"data":{"p":0.5,"inplace":"False"},"type":"dropout","del":8}],
# "colrow":[
#     [1,1,"Conv1d_1"],[1,2,"Linear_1"],[2,1,"Conv2d_1"],[3,1,"Conv1d_2"],[2,3,"Merge_1"],[2,4,"Linear_2"],[1,5,"Merge_2"],[1,6,"Linear_3"],[1,7,"Dropout_1"]],
# "link":[
#     {"id":"init1","source":"input_col1","target":"Conv1d_1"},
#     {"id":"e1,1,1,Conv1d_1,1,2,Linear_1,1,5,Merge_2,1,6,Linear_3,1,7,Dropout_13_4","source":"Linear_3","target":"Dropout_1"},
#     {"id":"e1,1,1,Conv1d_1,1,2,Linear_1,1,5,Merge_2,1,6,Linear_3,1,7,Dropout_12_3","source":"Merge_2","target":"Linear_3"},
#     {"id":"e1,1,1,Conv1d_1,1,2,Linear_1,1,5,Merge_2,1,6,Linear_3,1,7,Dropout_11_2","source":"Linear_1","target":"Merge_2"},
#     {"id":"e1,1,1,Conv1d_1,1,2,Linear_1,1,5,Merge_2,1,6,Linear_3,1,7,Dropout_10_1","source":"Conv1d_1","target":"Linear_1"},
#     {"id":"init2","source":"input_col2","target":"Conv2D_1"},
#     {"id":"e2,2,1,Conv2D_1,2,3,Merge_1,2,4,Linear_21_2","source":"Merge_1","target":"Linear_2"},
#     {"id":"e2,2,1,Conv2D_1,2,3,Merge_1,2,4,Linear_20_1","source":"Conv2D_1","target":"Merge_1"},
#     {"id":"init3","source":"input_col3","target":"Conv1d_2"},
#     {"id":"merge_3_Merge_1","source":"Conv1d_2","target":"Merge_1"},
#     {"id":"merge_2_Merge_2","source":"Linear_2","target":"Merge_2"}],
# "merge":[[2,3],[1,2]],
#  "input":"datatest","descript":""}
#  '''
# attribute_df = pd.DataFrame(model_args['model'])
# layer_df = pd.DataFrame(model_args['colrow'])
# layer_df.columns = ['col','row','LayerName']

# #generating restdf : ymPark
# rstdf = pd.DataFrame(columns=np.arange(1, layer_df.col.max()+1), index=np.arange(1, layer_df.row.max()+1))
# for j in layer_df.col:
#     for i in layer_df.row:
#         name  = "".join(layer_df[(layer_df.col == j) & (layer_df.row == i)]['LayerName'])
#         if len(name) < 1:
#             name = 'NaN'
#         else:pass  
#         rstdf.loc[i][j] = name
# rstdf = rstdf.dropna(axis=0, how='all').dropna(axis=1, how='all')
# rstdf.index = np.arange(1,len(rstdf)+1)
# rstdf.columns = np.arange(1, len(rstdf.columns)+1)
# #
# list_cols = []
# list_mers = []
# for cidx in rstdf.columns:
#     layer_row_cols = []
#     for ridx in rstdf.index:  
#         lay_nm = rstdf.loc[ridx][cidx]
#         ext    = rstdf[rstdf == lay_nm].dropna(axis=0, how='all').dropna(axis=1, how='all')
#         coords = [ext.index[0], ext.columns[0]]  
#         if  "Merge" not in lay_nm and "NaN" not in lay_nm:            
#             attr = attribute_df[attribute_df['newc'] == lay_nm]['data'].values[0]
#             convertedatt= str()
#             for key in attr:
#                 convertedatt += key + "'= '" + str(attr[key]) + "', " if isinstance(attr[key],str) and not attr[key] in ['True', 'False','zeros'] else key + "= " + str(attr[key]) + ", "
#             lay_cdic = {'type':'%s'%lay_nm.split('_')[0], 'coord':coords, 'attributes':convertedatt}
#             layer_row_cols.append(lay_cdic)   
#         elif "Merge" in lay_nm and "NaN" not in lay_nm:
#             #for ridx in range(ridx,max(rstdf.index)):
#             attr = attribute_df[attribute_df['newc'] == rstdf.loc[ridx+1][cidx]]['data'].values[0]
#             convertedatt= str()
#             for key in attr:
#                 convertedatt += key + "'= '" + str(attr[key]) + "', " if isinstance(attr[key],str) and not attr[key] in ['True', 'False','zeros'] else key + "= " + str(attr[key]) + ", "           
#             lay_mdic = {'row':ridx,
#                        'list_cols':attribute_df[attribute_df['newc'] == lay_nm]['merge'].values[0] ,
#                        'following_sequential':[
#                         {'type':rstdf.loc[ridx+1][cidx].split('_')[0],
#                                                'coord':[coords[0]+1, coords[1]],
#                                                'attributes': convertedatt}]}
#             list_mers.append(lay_mdic)
#     list_cols.append(layer_row_cols)
# list_mers = sorted(list_mers, key=lambda k: k['row'])
# #sample
# ###################################################################################################################################################################################################################################################################
# '''
# list_cols = [
#                 [#col1
#                     {'type':'Conv1d','coord':[1,1],'attributes':'out_features = 20, kernel_size = 2, stride = 1, padding = 0, dilation = 1, groups = 1, bias = True'},
#                     {'type':'Conv1d','coord':[2,1],'attributes':'out_features = 40, kernel_size = 2, stride = 1, padding = 0, dilation = 1,groups = 1,bias = True'},
#                     {'type':'Conv1d','coord':[3,1],'attributes':'out_features = 20, kernel_size = 2, stride = 1, padding = 0, dilation = 1,groups = 1,bias = True'},
#                     {'type':'Flatten','coord':[4,1],'attributes':'start_dim = 1, end_dim = -1'}],
#                 [#col2
#                     {'type':'Conv1d','coord':[1,2],'attributes':'20,2,1,0,1,1,True'},
#                     {'type':'Conv1d','coord':[2,2],'attributes':'40,2,1,0,1,1,True'},
#                     {'type':'Flatten','coord':[3,2],'attributes':'1,-1'}],
#                 [#col3
#                     {'type':'Conv1d','coord':[1,3],'attributes':'20,2,1,0,1,1,True'},
#                     {'type':'Conv1d','coord':[2,3],'attributes':'30,2,1,0,1,1,True'},
#                     {'type':'Conv1d','coord':[3,3],'attributes':'20,2,1,0,1,1,True'},
#                     {'type':'Flatten','coord':[4,3],'attributes':'1,-1'}],
#                 [#col4
#                     {'type':'Conv1d','coord':[1,4],'attributes':'20,2,1,0,1,1,True'},
#                     {'type':'Conv1d','coord':[2,4],'attributes':'20,2,1,0,1,1,True'},
#                     {'type':'Flatten','coord':[3,4],'attributes':'1,-1'}],
#                 [#col5
#                     {'type':'Conv1d','coord':[1,5],'attributes':'20, 2,1,0,1,1,True'},  
#                      {'type':'Conv1d','coord':[2,5],'attributes':'20,2,1,0,1,1,True'},
#                     {'type':'Conv1d','coord':[3,5],'attributes':'20,2,1,0,1,1,True'},
#                     {'type':'Conv1d','coord':[4,5],'attributes':'20,2,1,0,1,1,True'},
#                     {'type':'Flatten','coord':[5,5],'attributes':'1,-1'}],
#                 [#col6
#                     {'type':'Conv1d','coord':[1,6],'attributes':'20,2,1,0,1,1,True'},
#                     {'type':'Conv1d','coord':[2,6],'attributes':'20,2,1,0,1,1,True'},
#                     {'type':'Flatten','coord':[3,6],'attributes':'1,-1'}]]


# list_mers = [   #mer1
#                 {'row':5,'list_cols':[1,2,4], 'following_sequential':[
#                     {'type':'Linear','coord':[6,1],'attributes':'out_features = 10'},
#                     {'type':'Linear','coord':[6,1],'attributes':'out_features = 1'}]},
#                 #mer2
#                 {'row':5,'list_cols':[3,6], 'following_sequential':[
#                     {'type':'Linear','coord':[6,3],'attributes':'out_features = 10'},
#                     {'type':'Linear','coord':[6,3],'attributes':'out_features = 5'}]},
#                 #mer3
#                 {'row':7,'list_cols':[1,3,5], 'following_sequential':[
#                     {'type':'Linear','coord':[8,1],'attributes':'out_features = 10'},
#                     {'type':'Linear','coord':[8,1],'attributes':'out_features = 1'}]}]
# '''
# # Writing a script 
# ###################################################################################################################################################################################################################################################################
# with open(dir_script+'.py', 'w') as f:
#     f.write('import torch\n') 
#     f.write('import torch.nn as nn\n\n')  
#     f.write(f'class {args.model_name}(nn.Module):\n')
#     f.write('    def __init__(self,list_inps):\n')
#     f.write(f'       super({args.model_name}, self).__init__()\n')
#     for i in range(0,len(list_cols)):#한컬럼
#         if(list_cols[i][0]['type'] in list_lr_order): input_order = 2 #인풋셰이프순서
#         else: input_order = 1
#         f.write('        inp = list_inps[%d].size(%d)\n'%(i,input_order))
#         f.write('        self.seq_col%d = nn.Sequential(\n'%list_cols[i][0]['coord'][1])
#         for (idx,row) in enumerate(list_cols[i]):#한줄
#             if(row['type'] in list_lr_feature):#피쳐수 필요 레이어 
#                 if(idx == 0): f.write('        nn.%s(in_features = inp, %s),\n'%(row['type'], row['attributes']))#첫층
#                 else: f.write('        nn.%s(%s, %s),\n'%(row['type'],list_cols[i][idx-1]['attributes'].split(',')[0].replace('out','in'), row['attributes'])) #이전아웃풋->현재인풋
#             else:
#                 f.write('        nn.%s(%s),\n'%(row['type'], row['attributes']))#피쳐수 불필요 레이어 
#         f.write(')\n')
#     for i in range(0,len(list_cols)):
#         f.write('        out_%d = self.seq_col%d(list_inps[%d])\n'%(list_cols[i][0]['coord'][1],list_cols[i][0]['coord'][1],i))
#     f.write('\n')    
#     if len(list_mers) > 0:
#         for mer in list_mers:#한컬럼
#             merge_code = 'out = torch.cat(('
#             for col in mer['list_cols']:
#                 merge_code = merge_code +'out_%d,'%col
#             f.write('        %s),1)\n'%merge_code)
#             f.write('        self.seq_col%d_row%d = nn.Sequential(\n'%(min(mer['list_cols']),mer['row']))
#             for (idx,row) in enumerate(mer['following_sequential']):#한줄
#                 if(row['type'] in list_lr_feature):#피쳐수 필요 레이어  
#                     if(row['type'] in list_lr_order):input_order = 2 #인풋셰이프순서
#                     else: input_order = 1    
#                     if(idx == 0): f.write('        nn.%s(in_features = out.size(%d),%s),\n'%(row['type'],input_order, row['attributes'])) #첫층
#                     else: f.write('        nn.%s(%s,%s),\n'%(row['type'],mer['following_sequential'][idx-1]['attributes'].split(',')[0].replace('out','in'),row['attributes'])) #이전아웃풋->현재인풋
#                 else: f.write('        nn.%s(%s),\n'%(row['type'], row['attributes']))#피쳐수 불필요 레이어        
#             f.write(')\n')
#             f.write('        out_%d = self.seq_col%d_row%d(out)\n\n'%(min(mer['list_cols']),min(mer['list_cols']),mer['row']))#merge후아웃풋
#     f.write('\n\n')
#     f.write('    def forward(self, list_inps):\n')
#     for i in range(0,len(list_cols)):
#         f.write('        out_%d = self.seq_col%d(list_inps[%d])\n'%(list_cols[i][0]['coord'][1],list_cols[i][0]['coord'][1],i))
#     f.write('\n\n')
#     if len(list_mers) > 0:    
#         for mer in list_mers:
#             merge_code = 'out_%d = torch.cat(('%min(mer['list_cols'])
#             for col in mer['list_cols']:
#                 merge_code = merge_code +'out_%d,'%col
#             f.write('        %s),1)\n'%merge_code)
#             f.write('        out_%d = self.seq_col%d_row%d(out_%d)\n'%(min(mer['list_cols']),min(mer['list_cols']),mer['row'],min(mer['list_cols'])))
#     if len(list_mers) > 0:
#         f.write('        return out_%d\n'%min(mer['list_cols']))
#     else:
#         f.write('        return out_%d\n'%list_cols[0][0]['coord'][1])


# print('Script saved in %s'%dir_script,end='')
print('Script saved in',end='')