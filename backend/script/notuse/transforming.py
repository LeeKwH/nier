import sys, argparse, sklearn.preprocessing, pickle, math, numpy as np, pandas as pd
from scipy.stats import zscore  
sys.path.append('./')

parser = argparse.ArgumentParser(description='Arguments transported from JS to Py')
parser.add_argument('columns_j',type = str)
parser.add_argument('method',type = str)
parser.add_argument('user_name',type = str,default='user_1')

args  = parser.parse_args()
nowpath = os.getcwd()
dir_pck = nowpath+'/.user/'+args.user_name+'/.data/'+args.model_name+'/'+args.method+'.pkl' 

col = json.loads(args.columns_j,type = str)
df = pd.DataFrame.from_dict(col)


def Scaling(df):
    if args.method == 'standard':
        scaler = StandardScaler()
    elif args.method == 'minmax':
        scaler = MinMaxScaler()
    elif args.method == 'norm':
        scaler = Normalizer()
    elif args.method == 'z-score': 
        scaler = zscore()
    else:
        print("invalid method")

    pickle.dump(scaler.fit_transform(df), open(dir_pck, 'wb'))#리턴 선언 앞에 모든기능수행코드 위치
    return pd.DataFrame(scaler.fit_transform(df))


def Binarize(df):
    return df
    
def Function(df):
    if args.method == 'log10':
        return pd.DataFrame(math.log10(df))
    elif args.method == 'log2':
        return pd.DataFrame(math.log2(df))
    elif args.method == 'ln':
        return pd.DataFrame(math.ln(df))
    elif args.method == 'sigmoid':
        return pd.DataFrame(1/(1 + np.exp(-df)))
    elif args.method == 'tanh':
        return pd.DataFrame(np.tanh(df))    
    else: 
        print("error in the method")

if args.method in ['standard','minmax','norm','z-score']:
    df2=Scaling(df)

elif args.method in ['simple','label','multilabel']:
    df2=Binarize(df)

elif args.method in ['log10','log2','ln','sigmoid','tanh']:
    df2=Function(df)

else:
    print('invalid method')

print(json.dumps(df2.to_dict('records'), ensure_ascii=False ,separators=(',', ':')))




