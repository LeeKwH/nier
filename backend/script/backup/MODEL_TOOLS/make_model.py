import argparse, sys, os, re
sys.path.append('./')


parser = argparse.ArgumentParser()

parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)
#parser.add_argument('list_cols', type=str)
#parser.add_argument('list_mers', type=str)
parser.add_argument('input_info', type=str)
args = parser.parse_args()

dir_script = './LocalDB/'+args.user_name+'/model/'+args.model_name+'/script/'+args.model_name

# ============================================================================= #
# append code from ym

json_args = "from front-end"

jsondf = pd.DataFrame(json.load(json_args))
input_info = pd.DataFrame(json.load(args.input_info))
#input_info = [[1,1,"Sigmoid_1"],
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
4  Dropout_1   Merge_1        NaN
5        NaN  Linear_2        NaN
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
            lay_cdic = {'type':'%s'%lay_nm.split('_')[0], 'coord':'%s'%coords, 'attributes':attr}
            layer_row_cols.append(lay_cdic)
            
        elif "Merge" in lay_nm and "NaN" not in lay_nm:
            
            lay_mdic = {'row':'%s'%ridx,
                       'list_cols':jsondf[jsondf['newc'] == lay_nm]['merge'].values[0] ,
                       'following_sequential':{'type':rstdf.loc[ridx+1][cidx],
                                               'coord':[coords[0]+1, coords[1]],
                                               'attributes':'out.size(1),1'}
                      }
            print(lay_mdic)
            list_mers.append(lay_mdic)
            
    list_cols.append(layer_row_cols)


'''
list_cols = [
                [#col1
                    {'type':'Conv1d','coord':[1,1],'attributes':'inp,20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[2,1],'attributes':'20,20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[3,1],'attributes':'20,20,2,1,0,1,1,True'},
                    {'type':'Flatten','coord':[4,1],'attributes':'1,-1'}],
                [#col2
                    {'type':'Conv1d','coord':[1,2],'attributes':'inp,20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[2,2],'attributes':'20,20,2,1,0,1,1,True'},
                    {'type':'Flatten','coord':[3,2],'attributes':'1,-1'}],
                [#col3
                    {'type':'Conv1d','coord':[1,3],'attributes':'inp,20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[2,3],'attributes':'20,20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[3,3],'attributes':'20,20,2,1,0,1,1,True'},
                    {'type':'Flatten','coord':[4,3],'attributes':'1,-1'}],
                [#col4
                    {'type':'Conv1d','coord':[1,4],'attributes':'inp,20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[2,4],'attributes':'20,20,2,1,0,1,1,True'},
                    {'type':'Flatten','coord':[3,4],'attributes':'1,-1'}],
                [#col5
                    {'type':'Conv1d','coord':[1,5],'attributes':'inp,20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[2,5],'attributes':'20,20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[3,5],'attributes':'20,20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[4,5],'attributes':'20,20,2,1,0,1,1,True'},
                    {'type':'Flatten','coord':[5,5],'attributes':'1,-1'}],
                [#col6
                    {'type':'Conv1d','coord':[1,6],'attributes':'inp,20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[2,6],'attributes':'20,20,2,1,0,1,1,True'},
                    {'type':'Flatten','coord':[3,6],'attributes':'1,-1'}]]

list_mers = [   #mer1
                {'row':5,'list_cols':[1,2,4], 'following_sequential':[
                    {'type':'Linear','coord':[6,1],'attributes':'out.size(1),10'},
                    {'type':'Linear','coord':[6,1],'attributes':'10,1'}]},
                #mer2
                {'row':5,'list_cols':[3,6], 'following_sequential':[
                    {'type':'Linear','coord':[6,3],'attributes':'out.size(1),10'},
                    {'type':'Linear','coord':[6,3],'attributes':'10,5'}]},
                #mer3
                {'row':7,'list_cols':[1,3,5], 'following_sequential':[
                    {'type':'Linear','coord':[8,1],'attributes':'out.size(1),10'},
                    {'type':'Linear','coord':[8,1],'attributes':'10,1'}]}]
'''


# Writing a script
with open(dir_script+'.py', 'w') as f:
    f.write('import torch\n') 
    f.write('import torch.nn as nn\n\n')  
    f.write(f'class {args.model_name}(nn.Module):\n')  
    f.write('    def __init__(self,list_inps):\n')
    f.write(f'       super({args.model_name}, self).__init__()\n')
    for i in range(0,len(list_cols)):
        f.write('        inp = list_inps[%d].size(1)\n'%i)
        f.write('        self.seq_col%d = nn.Sequential(\n'%list_cols[i][0]['coord'][1])
        for row in list_cols[i]:
            f.write('        nn.%s(%s),\n'%(row['type'], row['attributes']))
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
    f.write('        return out_%d\n'%min(mer['list_cols']))

