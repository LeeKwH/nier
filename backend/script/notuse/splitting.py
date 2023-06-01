import argparse, sys, pandas as pd
sys.path.append('./')
nowpath = os.getcwd()

parser = argparse.ArgumentParser()
parser.add_argument('user_name', type=str)
parser.add_argument('model_name', type=str)
parser.add_argument('final_data', type=str) #process된 최종csv의 파일명
parser.add_argument('train_date',type=lambda s: datetime.datetime.strptime(s, '%Y-%m-%d'))
parser.add_argument('valid_date',type=lambda s: datetime.datetime.strptime(s, '%Y-%m-%d'))

args = parser.parse_args()
#dir_source = nowpath+'/.user/'+args.user_name+'/.data/'+args.model_name+'/'+args.final_data+'.csv' 
dir_source = nowpath+'/.user/'+args.user_name+'/.data/'+args.final_data+'.csv' 
dir_input = nowpath+'/.user/'+args.user_name+'/.input/'+args.model_name #ej

#Split into train/val/test
df = pd.read_csv(dir_source,  encoding='cp949',index_col=0)
train = df.loc[:args.train_date]
valid = df.loc[args.train_date:args.valid_date]
test = df.loc[args.valid_date:]

train.to_csv(dir_input + '_train.csv', encoding='cp949')
valid.to_csv(dir_input + '_valid.csv', encoding='cp949')
test.to_csv(dir_input + '_test.csv', encoding='cp949')
