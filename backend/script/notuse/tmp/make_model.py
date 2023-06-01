import argparse, sys, os,json,copy, pandas as pd, numpy as np
import list_lr
sys.path.append('./')
nowpath = os.getcwd()

parser = argparse.ArgumentParser()
parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)
args = parser.parse_args()

dir_script = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name +'/' 

#generating list_cols and list_mers
###################################################################################################################################################################################################################################################################
jsondic = json.load(open(dir_script+'modelinfo.json', encoding='UTF8'))
jsonlink = jsondic['link']
jsonmodel = jsondic['model']
jsoncolrow = {x[2]:[x[1],x[0]] for x in jsondic['colrow']}
deep_link = copy.deepcopy(jsonlink)
cols = {}
mers = {}

for link in jsonlink:
    if 'input' in link['source']:
        cols[link['source'][-1]] = [link['target']]
        deep_link.remove(link)
    elif 'Merge' in link['source']:
        mers[link['source']]={'row':0,'list_cols':[],'following_sequential':[link['target']]}
        deep_link.remove(link)

jsonlink = deep_link

for key in mers.keys():
    for source in mers[key]['following_sequential']:
        for link in jsondic['link']:
            if source == link['source'] and 'Merge' not in link['target']:
                mers[key]['following_sequential'].append(link['target'])
                deep_link.remove(link)
            elif source == link['source'] and 'Merge' in link['target']:
                deep_link.remove(link)

for link in deep_link:
    if 'Merge' not in link['target']:
        cols[link['id'].split(',')[0].split('e')[-1]].append(link['target'])

for key in cols.keys():
    layerlist = []
    for layer in cols[key]:
        for model in jsonmodel:
            if layer == model['newc']:
                att = ''
                for k,v in model['data'].items():
                    att += k + '=' + str(v) + ',' if isinstance(v, int) or isinstance(v, float) or v in ['True', 'False'] else k + '=' + "'" + v + "'" + ','
                layerlist.append({'type':model['type'],'coord':jsoncolrow[layer],'attributes':att})
    cols[key] = sorted(layerlist, key=lambda x: x['coord'][0])

for key in mers.keys():
    mers[key]['row'] = jsoncolrow[key][0]
    layerlist = []
    for layer in mers[key]['following_sequential']:
        for model in jsonmodel:
            if model['newc'] == key:
                mers[key]['list_cols'] = model['merge']
            if layer == model['newc']:
                att = ''
                for k,v in model['data'].items():
                    att += k + '=' + str(v) + ',' if isinstance(v, int) or isinstance(v, float) or v in ['True', 'False'] else k + '=' + "'" + v + "'" + ','
                layerlist.append({'type':model['type'],'coord':jsoncolrow[layer],'attributes':att})
    mers[key]['following_sequential'] = sorted(layerlist, key=lambda x: x['coord'][0])

list_cols = list(cols.values())
list_mers = list(mers.values())

# Writing a script 
###################################################################################################################################################################################################################################################################
with open(dir_script+args.model_name+'.py', 'w') as f:
    f.write('import torch\n') 
    f.write('import torch.nn as nn\n\n')  
    f.write(f'class {args.model_name}(nn.Module):\n')
    f.write('    def __init__(self,list_inps):\n')
    f.write(f'        super({args.model_name}, self).__init__()\n')
    for i in range(0,len(list_cols)):#한컬럼
        if(list_cols[i][0]['type'] in list_lr_order): input_order = 2 #첫줄 인풋셰이프순서
        else: input_order = 1
        f.write('        inp = list_inps[%d].size(%d)\n'%(i,input_order))
        f.write('        self.seq_col%d = nn.Sequential(\n'%list_cols[i][0]['coord'][1])
        for (idx,row) in enumerate(list_cols[i]):#한줄
            if(row['type'] in list_lr_feature):#피쳐수 필요 레이어
                if(row['type'] in list_lr_order): f.write('        transpose_tensor(),\n')#lstm류 나올때마다 미리 transpose 
                if(idx == 0): f.write('        nn.%s(in_features = inp, %s),\n'%(row['type'], row['attributes']))#첫층
                else: f.write('        nn.%s(%s, %s),\n'%(row['type'],list_cols[i][idx-1]['attributes'].split(',')[0].replace('out','in'), row['attributes'])) #이전아웃풋->현재인풋
                if(row['type'] in list_lr_order): f.write('        extract_tensor(),\n')#lstm류 나올때마다 followed by an extractor lr 
            else:
                f.write('        nn.%s(%s),\n'%(row['type'], row['attributes']))#피쳐수 불필요 레이어 
        f.write(')\n')
    for i in range(0,len(list_cols)):
        f.write('        out_%d = self.seq_col%d(list_inps[%d])\n'%(list_cols[i][0]['coord'][1],list_cols[i][0]['coord'][1],i))
    f.write('\n')    
    if len(list_mers) > 0:
        for mer in list_mers:#한컬럼
            merge_code = 'out = torch.cat(('
            for col in mer['list_cols']:
                merge_code = merge_code +'out_%d,'%col
            f.write('        %s),1)\n'%merge_code)
            f.write('        self.seq_col%d_row%d = nn.Sequential(\n'%(min(mer['list_cols']),mer['row']))
            for (idx,row) in enumerate(mer['following_sequential']):#한줄
                if(row['type'] in list_lr_feature):#피쳐수 필요 레이어  
                    if(row['type'] in list_lr_order): 
                        input_order = 2#인풋셰이프순서
                        f.write('        transpose_tensor(),\n')#lstm류 나올때마다 미리 transpose
                    else: input_order = 1    
                    if(idx == 0): f.write('        nn.%s(in_features = out.size(%d),%s),\n'%(row['type'],input_order, row['attributes'])) #첫층
                    else: f.write('        nn.%s(%s,%s),\n'%(row['type'],mer['following_sequential'][idx-1]['attributes'].split(',')[0].replace('out','in'),row['attributes'])) #이전아웃풋->현재인풋
                if(row['type'] in list_lr_order): f.write('        extract_tensor(),\n')#lstm류 나올때마다 followed by an extractor lr 
                else: f.write('        nn.%s(%s),\n'%(row['type'], row['attributes']))#피쳐수 불필요 레이어        
            f.write(')\n')
            f.write('        out_%d = self.seq_col%d_row%d(out)\n\n'%(min(mer['list_cols']),min(mer['list_cols']),mer['row']))#merge후아웃풋
    f.write('\n\n')
####################################################################################################################################    
    f.write('    def forward(self, list_inps):\n')
    for i in range(0,len(list_cols)):
        f.write('        out_%d = self.seq_col%d(list_inps[%d])\n'%(list_cols[i][0]['coord'][1],list_cols[i][0]['coord'][1],i))#input_formatter
        f.write('        out_%d = self.seq_col%d(list_inps[%d])\n'%(list_cols[i][0]['coord'][1],list_cols[i][0]['coord'][1],i))
    f.write('\n\n')
    if len(list_mers) > 0:    
        for mer in list_mers:
            merge_code = 'out_%d = torch.cat(('%min(mer['list_cols'])
            for col in mer['list_cols']:
                merge_code = merge_code +'out_%d,'%col
            f.write('        %s),1)\n'%merge_code)
            f.write('        out_%d = self.seq_col%d_row%d(out_%d)\n'%(min(mer['list_cols']),min(mer['list_cols']),mer['row'],min(mer['list_cols'])))
    if len(list_mers) > 0:
        f.write('        return out_%d\n'%min(mer['list_cols']))
    else:
        f.write('        return out_%d\n'%list_cols[0][0]['coord'][1])


print('Script saved in %s'%dir_script,end='')