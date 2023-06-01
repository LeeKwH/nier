import sys,argparse,json, scipy, math, pandas as pd, numpy as np
from mlxtend.feature_selection import SequentialFeatureSelector as SFS
from sklearn import linear_model 
from sklearn.decomposition import PCA
from sklearn import preprocessing
import os
import pickle
sys.path.append('./')
nowpath = os.getcwd()


parser = argparse.ArgumentParser(description='Arguments transported from JS to Py')
parser.add_argument('function',type = str)
parser.add_argument('method',type = str)
parser.add_argument('attribute',type = str)
parser.add_argument('columns',type = str)
parser.add_argument('user_name',type = str)
parser.add_argument('key',type = str)

args  = parser.parse_args()
dir_preprocess = nowpath+'/.user/'+args.user_name+'/.data/.tmp'
df1 = pd.DataFrame.from_dict(json.loads(args.columns))
df1 = df1.set_index(keys=['date'], drop=True)


# print(json.dumps(df1.to_dict('records'), ensure_ascii=False ,separators=(',', ':')))

##1. Data_Reduction
##1-1. Row_Wise       
def Sampling(df, mth, att):
    '''
    random sampling or maintain the ration of key variable during sampling 
    '''
    if mth == 'RandomSampling': df2= df.sample(n=int(att))
    elif mth == 'KeySampling' : df2 =df.groupby(att).apply(lambda x: x.sample(1,replace=True))    
    return df2 
#
##1-1. Column_Wise
def FeatureSelection(df,mth,target):
    '''
    select the feature with a minimum p-value. if p_value < significance
    estimator uses sklearn classifiers or regressors
    '''
    initial_features = df.columns.tolist()
    initial_features.remove(target)
    exec("sfs = SFS(linear_model.%s(),k_features='best',forward=forward,scoring =scoring,cv = 5)"%mth) 
    df2 = df[list(sfs.fit(df[initial_features],df[target]).k_feature_names_)]
    return df2
#
def ColumnSummary(df,mth):
    '''
    summarize column-wise values and replace with the new synthesized value
    '''
    if mth == 'mean' :
        df2 = pd.DataFrame(df.mean(axis=1),index = df.index, columns = df.columns)
    elif mth == 'amin' :
        df2 = pd.DataFrame(np.amin(df, axis=1),index = df.index, columns = df.columns)
    else:
        df2 = pd.DataFrame(np.amax(df, axis=1),index = df.index, columns = df.columns)
    return df2
#
def ColumnPCA(df,mth,n_components):
    pca = PCA(svd_solver= mth, n_components = int(n_components))
    pca.fit(df)
    df2 = pd.DataFrame(pca.transform(df),index = df.index, columns = df.columns)    
    return df2
##2. Data_Cleaning
##2-1. Missing_Data 
def InterpolUnivar(df,mth,order):
    '''
    Row-wise interpolation to NA values
    '''
    if mth in ['spline','polynomial'] : df2 = df.interpolate(method=mth, order = order)   
    else :df2 =  df.interpolate(method=mth)
    return  df2
#
def fillna(df,mth):
    '''
    fill NA with the nearest value
    '''
    if mth in ['bfill', 'pad', 'ffill']: df2 = df.fillna(method=mth)
    else : df2 = df.fillna(0)
    return df2
#
'''수정'''
def dropna(df,mth):
    '''
    remove rows with NA
    '''
    df2 = df.dropna(how=mth)
    return df2 
#
##3. Data_Transforming
##3-1. Scaling
def Scaling(df,mth): 
    '''
    apply sklearn scaling for each columns and save the mean dev values as pkl
    '''
    scaler = getattr(preprocessing, mth)()
    df2 = pd.DataFrame(scaler.fit_transform(df), index = df.index, columns = df.columns)
    # 수정
    scaler_save = f"{dir_preprocess}/{args.key}_{'-'.join(df.columns)}-.pkl"
    with open(scaler_save, "wb") as f:
        pickle.dump(scaler.fit(df), f)
    return df2 
##3-2. Function
def Function(df,mth):
    '''
    apply numpy functions on the entire df
    '''
    df2 = df.transform(getattr(np,mth))
    return df2

#실행코드
if args.attribute != "": exec("df2 = %s(df1,'%s','%s')"%(args.function, args.method, args.attribute))
else: exec("df2 = %s(df1,'%s')"%(args.function, args.method))
#exec("df2 = %s(df,'%s','%s')"%('FeatureSelection','LinearRegression','id'))
#exec("df2 = %s(df,'%s')"%('Function','sqrt'))
# exec("df2 = %s(df,'%s')"%('Scaling','MaxAbsScaler'))

#프론트 반환
print(json.dumps({'result':df2.to_dict('records')}, ensure_ascii=False ,separators=(',', ':')))



