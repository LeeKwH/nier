
import sys,argparse,json, pandas as pd


sys.path.append('./')
savepath ='D:\\cyj\\00_project\\02_algaeAI\\2023\\00_dev\\nier\\backend\\.user\\' 

parser = argparse.ArgumentParser(description='Arguments transported from JS to Py')
parser.add_argument('columns_j',type = str)
parser.add_argument('method',type = str)
parser.add_argument('user_name',type = str,default='user_1')

args  = parser.parse_args()
col = json.loads(args.columns_j)
df = pd.DataFrame.from_dict(col)

def Interpolate1D(df):
    return df.interpolate(method=args.method)

def DropNA(df):
    return df.dropna(how=args.method)

def RemoveNoise(df):
    return df

if args.method in ['linear', 'time', 'index', 'values','nearest', 'zero', 'slinear', 'quadratic', 'cubic',  'krogh', 'pchip', 'akima', 'cubicspline']:
    df2=Interpolate1D(df)

elif args.method in ['any', 'all']:
    df2=DropNA(df)

elif args.method in ['drop','bin','reg','clust']:
    df2=RemoveNoise(df)

else:
    print('invalid method')

# df2.index.astype(str, copy = False)
print(json.dumps(df2.to_dict('records'), ensure_ascii=False ,separators=(',', ':')))