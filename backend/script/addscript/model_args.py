
import argparse, sys, os, re, json, pickle, pandas as pd, numpy as np
import list_lr 
sys.path.append('./')
nowpath = os.getcwd()

parser = argparse.ArgumentParser()
parser.add_argument('model_args', type=str)
args = parser.parse_args()
model_args = json.loads(json.dumps(args.model_args))

dir_model_input = nowpath+'/.user/'+args.user_name+'/.model/'+args.model_name+'/first_cols.pkl'
'''
model_args = {
"id":"admin",
"prjname":"modeltest",
"model":[
    {"id":0,"newc":"Conv1d_1","column":0,"row":0,"data":{"out_channels":1,"kernel_size":1,"stride":1,"padding":0,"dilation":1,"groups":0,"bias":"True","padding_mode":"zeros"},"type":"Conv1d","del":0},
    {"id":1,"newc":"Linear_1","column":1,"row":1,"data":{"out_features":1,"bias":"True"},"type":"Linear","del":1},
    {"id":2,"newc":"Conv2d_1","column":2,"row":2,"data":{"out_channels":1,"kernel_size":1,"stride":1,"padding":0,"dilation":1,"groups":0,"bias":"True","padding_mode":"zeros"},"type":"Conv2d","del":2},
    {"id":3,"newc":"Conv1d_2","column":3,"row":3,"data":{"out_channels":1,"kernel_size":1,"stride":1,"padding":0,"dilation":1,"groups":0,"bias":"True","padding_mode":"zeros"},"type":"Conv1d","del":3},
    {"id":4,"newc":"Merge_1","column":4,"row":4,"data":{},"type":"Merge","del":4,"merge":[2,3]},
    {"id":5,"newc":"Linear_2","column":5,"row":5,"data":{"out_features":1,"bias":"True"},"type":"Linear","del":5},
    {"id":6,"newc":"Merge_2","column":6,"row":6,"data":{},"type":"Merge","del":6,"merge":[1,2]},
    {"id":7,"newc":"Linear_3","column":7,"row":7,"data":{"out_features":1,"bias":"True"},"type":"Linear","del":7},
    {"id":8,"newc":"Dropout_1","column":8,"row":8,"data":{"p":0.5,"inplace":"False"},"type":"dropout","del":8}],
"colrow":[
    [1,1,"Conv1d_1"],[1,2,"Linear_1"],[2,1,"Conv2d_1"],[3,1,"Conv1d_2"],[2,3,"Merge_1"],[2,4,"Linear_2"],[1,5,"Merge_2"],[1,6,"Linear_3"],[1,7,"Dropout_1"]],
"link":[
    {"id":"init1","source":"input_col1","target":"Conv1d_1"},
    {"id":"e1,1,1,Conv1d_1,1,2,Linear_1,1,5,Merge_2,1,6,Linear_3,1,7,Dropout_13_4","source":"Linear_3","target":"Dropout_1"},
    {"id":"e1,1,1,Conv1d_1,1,2,Linear_1,1,5,Merge_2,1,6,Linear_3,1,7,Dropout_12_3","source":"Merge_2","target":"Linear_3"},
    {"id":"e1,1,1,Conv1d_1,1,2,Linear_1,1,5,Merge_2,1,6,Linear_3,1,7,Dropout_11_2","source":"Linear_1","target":"Merge_2"},
    {"id":"e1,1,1,Conv1d_1,1,2,Linear_1,1,5,Merge_2,1,6,Linear_3,1,7,Dropout_10_1","source":"Conv1d_1","target":"Linear_1"},
    {"id":"init2","source":"input_col2","target":"Conv2D_1"},
    {"id":"e2,2,1,Conv2D_1,2,3,Merge_1,2,4,Linear_21_2","source":"Merge_1","target":"Linear_2"},
    {"id":"e2,2,1,Conv2D_1,2,3,Merge_1,2,4,Linear_20_1","source":"Conv2D_1","target":"Merge_1"},
    {"id":"init3","source":"input_col3","target":"Conv1d_2"},
    {"id":"merge_3_Merge_1","source":"Conv1d_2","target":"Merge_1"},
    {"id":"merge_2_Merge_2","source":"Linear_2","target":"Merge_2"}],
"merge":[[2,3],[1,2]],
 "input":"datatest","descript":""}
 '''

#generating list_cols and list_mers
##################################################################################################################################################################################################################################################################'''
attribute_df = pd.DataFrame(model_args['model'])
layer_df = pd.DataFrame(model_args['colrow'])
layer_df.columns = ['col','row','LayerName']

#generating restdf : ymPark
rstdf = pd.DataFrame(columns=np.arange(1, layer_df.col.max()+1), index=np.arange(1, layer_df.row.max()+1))
for j in layer_df.col:
    for i in layer_df.row:
        name  = "".join(layer_df[(layer_df.col == j) & (layer_df.row == i)]['LayerName'])
        if len(name) < 1:
            name = 'NaN'
        else:pass  
        rstdf.loc[i][j] = name
rstdf = rstdf.dropna(axis=0, how='all').dropna(axis=1, how='all')
rstdf.index = np.arange(1,len(rstdf)+1)
rstdf.columns = np.arange(1, len(rstdf.columns)+1)
#
list_cols = []
list_mers = []
for cidx in rstdf.columns:#한 컬럼
    layer_row_cols = []
    for ridx in rstdf.index:#한 줄  
        lay_nm = rstdf.loc[ridx][cidx]
        ext    = rstdf[rstdf == lay_nm].dropna(axis=0, how='all').dropna(axis=1, how='all')
        coords = [ext.index[0], ext.columns[0]]  
        if  "Merge" not in lay_nm and "NaN" not in lay_nm:            
            attr = attribute_df[attribute_df['newc'] == lay_nm]['data'].values[0]
            convertedatt= str()
            for key in attr:
                convertedatt += key + "'= '" + str(attr[key]) + "', " if isinstance(attr[key],str) and not attr[key] in ['True', 'False','zeros'] else key + "= " + str(attr[key]) + ", "
            lay_cdic = {'type':'%s'%lay_nm.split('_')[0], 'coord':coords, 'attributes':convertedatt}
            layer_row_cols.append(lay_cdic)   
        elif "Merge" in lay_nm and "NaN" not in lay_nm:
            #for ridx in range(ridx,max(rstdf.index)):
            attr = attribute_df[attribute_df['newc'] == rstdf.loc[ridx+1][cidx]]['data'].values[0]
            convertedatt= str()
            for key in attr:
                convertedatt += key + "'= '" + str(attr[key]) + "', " if isinstance(attr[key],str) and not attr[key] in ['True', 'False','zeros'] else key + "= " + str(attr[key]) + ", "           
            lay_mdic = {'row':ridx,
                       'list_cols':attribute_df[attribute_df['newc'] == lay_nm]['merge'].values[0] ,
                       'following_sequential':[
                        {'type':rstdf.loc[ridx+1][cidx].split('_')[0],
                                               'coord':[coords[0]+1, coords[1]],
                                               'attributes': convertedatt}]}
            list_mers.append(lay_mdic)
    list_cols.append(layer_row_cols)
list_mers = sorted(list_mers, key=lambda k: k['row'])

first_cols = []
for col in list_cols: first_cols.append(col[0]['type'])
with open(dir_model_input, 'wb') as f:
    pickle.dump(first_cols, f)
#sample
###################################################################################################################################################################################################################################################################
'''
list_cols = [
                [#col1
                    {'type':'Conv1d','coord':[1,1],'attributes':'out_features = 20, kernel_size = 2, stride = 1, padding = 0, dilation = 1, groups = 1, bias = True'},
                    {'type':'Conv1d','coord':[2,1],'attributes':'out_features = 40, kernel_size = 2, stride = 1, padding = 0, dilation = 1,groups = 1,bias = True'},
                    {'type':'Conv1d','coord':[3,1],'attributes':'out_features = 20, kernel_size = 2, stride = 1, padding = 0, dilation = 1,groups = 1,bias = True'},
                    {'type':'Flatten','coord':[4,1],'attributes':'start_dim = 1, end_dim = -1'}],
                [#col2
                    {'type':'Conv1d','coord':[1,2],'attributes':'20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[2,2],'attributes':'40,2,1,0,1,1,True'},
                    {'type':'Flatten','coord':[3,2],'attributes':'1,-1'}],
                [#col3
                    {'type':'Conv1d','coord':[1,3],'attributes':'20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[2,3],'attributes':'30,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[3,3],'attributes':'20,2,1,0,1,1,True'},
                    {'type':'Flatten','coord':[4,3],'attributes':'1,-1'}],
                [#col4
                    {'type':'Conv1d','coord':[1,4],'attributes':'20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[2,4],'attributes':'20,2,1,0,1,1,True'},
                    {'type':'Flatten','coord':[3,4],'attributes':'1,-1'}],
                [#col5
                    {'type':'Conv1d','coord':[1,5],'attributes':'20, 2,1,0,1,1,True'},  
                     {'type':'Conv1d','coord':[2,5],'attributes':'20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[3,5],'attributes':'20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[4,5],'attributes':'20,2,1,0,1,1,True'},
                    {'type':'Flatten','coord':[5,5],'attributes':'1,-1'}],
                [#col6
                    {'type':'Conv1d','coord':[1,6],'attributes':'20,2,1,0,1,1,True'},
                    {'type':'Conv1d','coord':[2,6],'attributes':'20,2,1,0,1,1,True'},
                    {'type':'Flatten','coord':[3,6],'attributes':'1,-1'}]]


list_mers = [   #mer1
                {'row':5,'list_cols':[1,2,4], 'following_sequential':[
                    {'type':'Linear','coord':[6,1],'attributes':'out_features = 10'},
                    {'type':'Linear','coord':[6,1],'attributes':'out_features = 1'}]},
                #mer2
                {'row':5,'list_cols':[3,6], 'following_sequential':[
                    {'type':'Linear','coord':[6,3],'attributes':'out_features = 10'},
                    {'type':'Linear','coord':[6,3],'attributes':'out_features = 5'}]},
                #mer3
                {'row':7,'list_cols':[1,3,5], 'following_sequential':[
                    {'type':'Linear','coord':[8,1],'attributes':'out_features = 10'},
                    {'type':'Linear','coord':[8,1],'attributes':'out_features = 1'}]}]
'''