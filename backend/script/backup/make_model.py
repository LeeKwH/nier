import argparse, sys, os, json, pandas as pd, numpy as np
sys.path.append('./')
nowpath = os.getcwd()


parser = argparse.ArgumentParser()

parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)
parser.add_argument('data', type=str) # in modelinfo -> key = model
parser.add_argument('colrow', type=str) # in modelinfo -> key = colrow
# in modelinfo -> key = link 내에서 key = source 는 연결 시작 레이어, key = target은 연결 끝 레이어; source-target
args = parser.parse_args()

dir_script = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/'

# list_cols = json.loads(args.list_cols,type = str)
# list_mers = json.loads(args.list_mers,type = str)

'''
list_cols = [
                [#col1
                    {'type':'LSTM','coord':[1,1],'attributes':'15,20,2,True,False,0,False,0'},
                    {'type':'Conv2d','coord':[2,1],'attributes':'20,20,(2,3),(1,1),(0,0),1,1,True'}],
                [#col2
                    {'type':'ConvTranspose2d','coord':[1,2],'attributes':'15,20,(2,3),(1,1),(0,0),(0,0)1,True,1'}],
                [#col3
                    {'type':'Linear','coord':[1,3],'attributes':'15,10'}]]


list_mers = [   #mer1
                {'row':3,'list_cols':[1,2], 'following_sequential':[
                    {'type':'Dropout','coord':[4,1],'attributes':'.50,False'}]},
                #mer2
                {'row':5,'list_cols':[2,3], 'following_sequential':[
                    {'type':'Linear','coord':[6,2],'attributes':'out.size(1),out_feature=[] '}]}]
'''

# ============================================================================= #
# append code from ym

json_args = args.data

jsondf = pd.DataFrame(json.loads(json_args)) # data :yj
input_info = json.loads(args.colrow)
#input_info = [[1,1,"Sigmoid_1"], # col, row, layer name :yj
#              [1,2,"Tanh_1"],
#              [1,3,"Tanh_2"],
#              [2,1,"Linear_1"],
#              [3,1,"Sigmoid_2"],
#              [2,4,"Merge_1"],
#              [1,4,"Dropout_1"],
#              [2,5,"Linear_2"],
#              [1,6,"Merge_2"],
#              [1,7,"ReLU_1"]]

indf = pd.DataFrame(input_info)
indf.columns = ['col','row','LayerName']

rstdf = pd.DataFrame(columns=np.arange(1, indf.col.max()+1), index=np.arange(1, indf.row.max()+1))

for j in indf.col:
    for i in indf.row:
        name  = "".join(indf[(indf.col == j) & (indf.row == i)]['LayerName'])
        if len(name) < 1:
            name = 'NaN'
        else:pass  
        rstdf.loc[i][j] = name
rstdf = rstdf.dropna(axis=0, how='all').dropna(axis=1, how='all')
rstdf.index = np.arange(1,len(rstdf)+1)
rstdf.columns = np.arange(1, len(rstdf.columns)+1)
""" 
rst df 
           1         2          3
1  Sigmoid_1  Linear_1  Sigmoid_2
2     Tanh_1       NaN        NaN
3     Tanh_2       NaN        NaN
4  Dropout_1              Merge_1
5        NaN  Linear_        NaN
6    Merge_2       NaN        NaN
7     ReLU_1       NaN        NaN
"""

list_cols = []
list_mers = []

for cidx in rstdf.columns:
    
    layer_row_cols = []

    for ridx in rstdf.index:
        
        lay_nm = rstdf.loc[ridx][cidx]
        ext    = rstdf[rstdf == lay_nm].dropna(axis=0, how='all').dropna(axis=1, how='all')
        coords = [ext.index[0], ext.columns[0]]
        
        if  "Merge" not in lay_nm and "NaN" not in lay_nm:
            attr = jsondf[jsondf['newc'] == lay_nm]['data'].values[0]
            convertedatt= str()
            for key in attr:
                convertedatt += key + "= '" + str(attr[key]) + "', " if isinstance(attr[key],str) and not attr[key] in ['True', 'False'] else key + "= " + str(attr[key]) + ", "
            lay_cdic = {'type':'%s'%lay_nm.split('_')[0], 'coord':coords, 'attributes':convertedatt}
            layer_row_cols.append(lay_cdic)
            
        elif "Merge" in lay_nm and "NaN" not in lay_nm:
            
            lay_mdic = {'row':ridx,
                       'list_cols':jsondf[jsondf['newc'] == lay_nm]['merge'].values[0] ,
                       'following_sequential':[{'type':rstdf.loc[ridx+1][cidx].split('_')[0],
                                               'coord':[coords[0]+1, coords[1]],
                                               'attributes':'out.size(1),1'}]
                      }
            list_mers.append(lay_mdic)
            
    list_cols.append(layer_row_cols)

"""
# list_cols
[[{'type': 'Sigmoid', 'coord': '[1, 1]', 'attributes': {}},
  {'type': 'Tanh', 'coord': '[2, 1]', 'attributes': {}},
  {'type': 'Tanh', 'coord': '[3, 1]', 'attributes': {}},
  {'type': 'Dropout',
   'coord': '[4, 1]',
   'attributes': {'p': 0.5, 'inplace': 'False'}},
  {'type': 'ReLU', 'coord': '[7, 1]', 'attributes': {}}],
 [{'type': 'Linear',
   'coord': '[1, 2]',
   'attributes': {'out_features': 0, 'bias': 'True'}},
  {'type': 'Linear',
   'coord': '[5, 2]',
   'attributes': {'out_features': 0, 'bias': 'True'}}],
 [{'type': 'Sigmoid', 'coord': '[1, 3]', 'attributes': {}}]]


 # list_mers
[{'row': '6',
  'list_cols': [1, 2],
  'following_sequential': {'type': 'ReLU_1',
   'coord': [7, 1],
   'attributes': 'out.size(1)'}},
 {'row': '4',
  'list_cols': [2, 3],
  'following_sequential': {'type': 'Linear_2',
   'coord': [5, 2],
   'attributes': 'out.size(1),1'}}]

"""


# ============================================================================= #







# Writing a script
with open(dir_script+args.model_name+'.py', 'w') as f:
    f.write('import torch\n') 
    f.write('import torch.nn as nn\n\n')  
    f.write(f'class {args.model_name}(nn.Module):\n')  
    f.write('    def __init__(self,list_inps):\n')
    f.write(f'        super({args.model_name}, self).__init__()\n')
    for i in range(0,len(list_cols)):
        f.write('        inp = list_inps[%d].size(1)\n'%i)
        f.write('        self.seq_col%d = nn.Sequential(\n'%list_cols[i][0]['coord'][1])
        for idx,row in enumerate(list_cols[i]):
            f.write('        nn.%s(inp, %s),\n'%(row['type'], row['attributes'])) if idx == 0 else f.write('        nn.%s(%s),\n'%(row['type'], row['attributes']))
        f.write(')\n')
    for i in range(0,len(list_cols)):
        f.write('        out_%d = self.seq_col%d(list_inps[%d])\n'%(list_cols[i][0]['coord'][1],list_cols[i][0]['coord'][1],i))
    f.write('\n')        
    if len(list_mers) > 0:
        for mer in list_mers:
            merge_code = 'out = torch.cat(('
            for col in mer['list_cols']:
                merge_code = merge_code +'out_%d,'%col
            f.write('        %s),1)\n'%merge_code)
            f.write('        self.seq_col%d_row%d = nn.Sequential(\n'%(min(mer['list_cols']),mer['row']))
            for row in mer['following_sequential']:
                layer_code = 'nn.%s(%s)'%(row['type'],row['attributes'])
                f.write('        nn.%s(%s),\n'%(row['type'],row['attributes']))
            f.write(')\n')
            f.write('        out_%d = self.seq_col%d_row%d(out)\n\n'%(min(mer['list_cols']),min(mer['list_cols']),mer['row']))
    f.write('\n\n')
    f.write('    def forward(self, list_inps):\n')
    for i in range(0,len(list_cols)):
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