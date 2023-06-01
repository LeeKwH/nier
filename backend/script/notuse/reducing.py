import sys, argparse, sklearn.preprocessing, numpy as np, pandas as pd
import statsmodels.api as sm
from sklearn.decomposition import PCA
sys.path.append('./')


parser = argparse.ArgumentParser(description='Arguments transported from JS to Py')
parser.add_argument('columns_j',type = str)
parser.add_argument('method',type = str)
parser.add_argument('user_name',type = str,default='user_1')
args  = parser.parse_args()
col = json.loads(args.columns_j,type = str)
df = pd.DataFrame.from_dict(col)


class RowWise:
    def RandomSampling(self,rows):
        '''
        random sampling on the rows  
        '''
        return self.dataframe.sample(n=rows)

    def StratifiedSampling(self,key,rows):
        '''
        maintaining the ration of key variable during sampling  
        '''
        return self.dataframe.groupby('key', group_keys=False).apply(lambda x: x.sample(rows))

class ColumnWise():
    def __init__(self, dataframe):
    self.dataframe = dataframe

    def ForwardSelect(self, target, significance_level=0.05):
    '''
    select the feature with a minimum p-value. if p_value < significance
    '''
        initial_features = self.dataframe.columns.tolist()
        best_features = []
        while (len(initial_features)>0):
            remaining_features = list(set(initial_features)-set(best_features))
            new_pval = pd.Series(index=remaining_features)
            for new_column in remaining_features:
                model = sm.OLS(target, sm.add_constant(self.dataframe[best_features+[new_column]])).fit()
                new_pval[new_column] = model.pvalues[new_column]
            min_p_value = new_pval.min()
            if(min_p_value<significance_level):
                best_features.append(new_pval.idxmin())
            else:
                break
        return best_features

    def ColumnMax(self):
        return self.dataframe.max(axis=1)    

    def ColumnMean(self):
        return self.dataframe.mean(axis=1)

    def PCA(self,components):
        pca = PCA(n_components = components)
        pca.fit(self.dataframe)
        data_pca = pca.transform(self.dataframe)    
        return pd.DataFrame(data_pca)


if args.method in ['randomsampling','stratifiedsampling']:
    df2=Scaling()

if args.method == 'forward-selection':
    ForwardSelect()


print(json.dumps(df2.to_dict('records'), ensure_ascii=False ,separators=(',', ':')))





