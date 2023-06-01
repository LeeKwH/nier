import pandas as pd, keras as k, numpy as np, matplotlib.pyplot as plt, os, re, glob

import joblib

from scipy.stats import pearsonr

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import tensorflow as tf
from keras.models import Sequential
from keras.layers import LSTM, Dense, Dropout, Attention
from keras.callbacks import EarlyStopping
from keras.callbacks import CSVLogger
from sklearn.preprocessing import MinMaxScaler

from sklearn.preprocessing import StandardScaler

import sys,json

nowpath = os.getcwd()
# set the korean font for matplotlib
from matplotlib import font_manager, rc
# font_path = "C:/Windows/Fonts/malgun.ttf"
# font_name = font_manager.FontProperties(fname=font_path).get_name()
# rc('font', family=font_name)

# YJ
username = sys.argv[1]
modelname = sys.argv[2]
dir_loss = nowpath+'/.user/'+username+'/.model/'+modelname+'/'
dir_script = nowpath+'/.user/'+username+'/.model/'+modelname+'/'
# csv_logger = CSVLogger(dir_loss+'log.txt', append=True, separator=',')
csv_logger = CSVLogger(dir_loss+'log.txt', separator=',')
dir_log = nowpath+'/.share/.log/'+username+'-'+modelname
# tensorboard_callback = tf.keras.callbacks.TensorBoard(log_dir=dir_log, histogram_freq=1)
tensorboard_callback = tf.keras.callbacks.TensorBoard(log_dir=dir_log,write_graph=True)

tmp_learn_config = json.load(open(dir_loss+'trainconfig.json','r', encoding="UTF-8"))
epoch = tmp_learn_config['epoch']

model_info = json.load(open(dir_script+'modelinfo.json','r', encoding="UTF-8"))
input_tmp = model_info['variable']
input_dataset = model_info['input']
output_info = input_tmp.pop('out')
input_info = list(input_tmp.values())
inputs = []
for i in input_info:
    inputs += i
dir_source = nowpath+'/.user/'+username+'/.data/'+input_dataset+'/'+input_dataset+'.csv'

# YJ
seqshf = model_info['seqshf']
Inseq = seqshf['Input Sequence']
Outseq = seqshf['Output Sequence']
Inshift = seqshf['Input Shift']
Outshift = seqshf['Output Shift']
out_columns = ['%s(t+%d)'%(x,y) for x in output_info for y in range(Outseq)]

train_ratio = tmp_learn_config['Train ratio']/10
valid_ratio = tmp_learn_config['Validation ratio']/10

# read ./DATA/POST_DATA/all_data.csv
# data = pd.read_csv(nowpath+'/script/attn/POST_DATA/all_data.csv', encoding='cp949', index_col=0, parse_dates=True)
data = pd.read_csv(dir_source,  encoding='UTF-8',index_col='date')
data.index=pd.to_datetime(data.index, format='%Y-%m-%d')
# slice data < 2021-12-31
# data = data.loc[:'2019-12-31']

raw_index = data[output_info].dropna(axis=0).index

# interpolate nan values in '유해남조류세포수'
# condition 1 : the period of nan value is less than 14 rows : interpolate nan value with linear method
# condtionn 2 : the period of nan value is more than 14 rows : no action
data[output_info] = data[output_info].interpolate(method='linear', limit=7, limit_direction='backward')


# make target column
data[output_info] = data[output_info].shift(-Outshift)

# drop column '유해남조류세포수'
# data = data.drop('유해남조류세포수', axis=1)

# calculte % of nan values in each columns of data
# nan_df = pd.DataFrame(data.isnull().sum()/len(data)*100, columns=['% of NaN'])
# print(nan_df, '\n',data.shape)


# nan_df.to_csv(nowpath+'/script/attn/model_attn/var_info.csv', encoding='cp949')


# drop columns if nan is over 30% and apply all columns except '유해남조류세포수_Y'
# droprate = 0.30
# for i in data.columns:
#     if nan_df.loc[i, '% of NaN'] > droprate*100 and i != 'Y':
#         data = data.drop(i, axis=1)

# calculte % of nan values in each columns of data
# nan_df = pd.DataFrame(data.isnull().sum()/len(data)*100, columns=['% of NaN'])
# print(nan_df, '\n',data.shape)


# x_features = data.iloc[:,:-1].shape[1]
# print(x_features)


def create_dataset(data, n_in=1, n_out=1, dropnan=True):
    n_vars = 1 if type(data) is list else data.shape[1]
    df = pd.DataFrame(data)
    cols, names = list(), list()
    # input sequence (t-n, ... t-1)
    for i in range(n_in, 0, -1): 
        cols.append(df.shift(i))
        names += [('var%d(t-%d)' % (j+1, i)) for j in range(n_vars)]
    # forecast sequence (t, t+1, ... t+n)
    for i in range(0, n_out):
        cols.append(df.shift(-i))
        if i == 0:
            names += [('var%d(t)' % (j+1)) for j in range(n_vars)]
        else:
            names += [('var%d(t+%d)' % (j+1, i)) for j in range(n_vars)]
    # put it all together
    agg = pd.concat(cols, axis=1)
    agg.columns = names
    # drop rows with NaN values
    if dropnan:
        agg.dropna(axis=0, how='any', inplace=True)
    return agg


# input_df is data without '유해남조류세포수'
# input_df = data.drop(output_info, axis=1)

input_df = data[inputs]

x_features = input_df.shape[1]

otput_df = data[output_info]

input_t_step = Inseq

input_cols = input_df.columns

# normalize features
scaler = StandardScaler()
scaler.fit(input_df)
scaled = scaler.fit_transform(input_df)

# save min, max values
min_values = input_df.min()
max_values = input_df.max()

input_df = pd.DataFrame(scaled, columns=input_df.columns, index=input_df.index)

input_df = create_dataset(input_df, n_in=input_t_step, n_out=0, dropnan=False)
otput_df = create_dataset(otput_df, n_in=0, n_out=Outseq, dropnan=False)

# model_df = pd.concat([input_df, otput_df], axis=1)
# model_df = model_df.loc[raw_index].dropna(axis=0)

#shuffle data
# model_df = model_df.sample(frac=1)

input_df = input_df.loc[raw_index].bfill().ffill()
otput_df = otput_df.loc[raw_index].interpolate(method='linear',limit_direction='backward').bfill().ffill()

# print(model_df.shape)


# X = input_df.iloc[:,:-1].values.reshape(input_df.shape[0], input_t_step, x_features)
# y = otput_df.iloc[:,-1].values.reshape(otput_df.shape[0], Outseq)
X = input_df.values.reshape(input_df.shape[0], input_t_step, x_features)
y = otput_df.values.reshape(otput_df.shape[0], Outseq)

# print(X.shape, y.shape)


# train, validation, test 데이터셋으로 분할
train_size = int(train_ratio * len(X))
val_size = int(valid_ratio * len(X))

X_train, y_train = X[:train_size], y[:train_size]
X_val, y_val = X[train_size:train_size+val_size], y[train_size:train_size+val_size]
X_test, y_test = X[train_size+val_size:], y[train_size+val_size:]



class Attention(tf.keras.layers.Layer):
    def __init__(self, units, **kwargs):
        super(Attention, self).__init__(**kwargs)
        super(Attention, self).__init__()
        self.units = units

    def build(self, input_shape):
        self.W1 = self.add_weight(name='W1', shape=(input_shape[-1], self.units), initializer='glorot_uniform', trainable=True)
        self.W2 = self.add_weight(name='W2', shape=(self.units, self.units), initializer='glorot_uniform', trainable=True)
        self.V = self.add_weight(name='V', shape=(self.units,), initializer='glorot_uniform', trainable=True)

    def call(self, inputs):
        hidden_states = inputs
        score = tf.matmul(hidden_states, self.W1)
        score = tf.tanh(tf.matmul(score, self.W2))
        attention_weights = tf.nn.softmax(tf.matmul(score, tf.reshape(self.V, (-1, 1))), axis=1)
        context_vector = attention_weights * hidden_states
        context_vector = tf.reduce_sum(context_vector, axis=1)
        return context_vector
    
    def get_config(self):
        # config = {'units':self.units}
        base_config = super(Attention, self).get_config()
        base_config.update({'units':self.units})
        return base_config
        # return dict(list(base_config.items()) + list(config.items()))
        # return dict(list(base_config.items()))
        # return base_config

model = tf.keras.Sequential()

model.add(tf.keras.layers.LSTM(64, input_shape=(input_t_step, X_train.shape[2]), return_sequences=True))
model.add(tf.keras.layers.LSTM(64, return_sequences=True))
model.add(tf.keras.layers.LSTM(64, return_sequences=True))
model.add(Attention(64))
model.add(tf.keras.layers.Dropout(0.2))

model.add(tf.keras.layers.Dense(32, activation='relu'))
model.add(tf.keras.layers.Dense(Outseq))



# model compile
model.compile(optimizer='adam', loss='mse',metrics=['msle','mape',tf.keras.metrics.CosineSimilarity(axis=1)])

# model training
es = EarlyStopping(monitor='val_loss', patience=16, verbose=1, mode='min')

history = model.fit(X_train, y_train,
                    epochs=epoch,
                    # epochs=10,
                    batch_size=32,
                    verbose=0,
                    validation_data=(X_val, y_val),
                    callbacks=[es,csv_logger,tensorboard_callback])



model.save(dir_loss+'/model.h5')

# =============================================== model evaluate ===============================================
test_score = model.evaluate(X_test, y_test, verbose=0)
# 0 = mse, 1 = msle, 2 = mape, 3 = cosine similarity



# mse_train = model.evaluate(X_train, y_train, verbose=0)
# mse_val = model.evaluate(X_val, y_val, verbose=0)
# mse_test = model.evaluate(X_test, y_test, verbose=0)

# print("MSE Train:", mse_train)
# print("MSE Validation:", mse_val)
# print("MSE Test:", mse_test)


# # plot the loss and accuracy
# fig, ax = plt.subplots(figsize=(15, 4))
# plt.plot(history.history['loss'], label='train')
# plt.plot(history.history['val_loss'], label='validation')
# plt.legend()
# plt.savefig('./model_attn/result/loss.png', facecolor='white', dpi=300)
# plt.show()
# plt.close()


with open(dir_loss+'/calresult.json', 'w') as f:
    json.dump({"MAPE":test_score[2], "RMSLE":np.sqrt(test_score[1]), "Cos_sim":test_score[3]},f)

y_pred = model.predict(X_test)

test_yhat = pd.DataFrame(y_pred,columns=out_columns)
test_y = pd.DataFrame(y_test,columns=out_columns)

with open(dir_loss+'/testresultraw.json', 'w', encoding='utf-8') as f:
    json.dump({"test_yhat":y_pred.tolist(), "test_y":y_test.tolist()},f)
with open(dir_loss+'/testresult.json', 'w', encoding='utf-8') as f:
    json.dump({"test_yhat":test_yhat.to_dict(), "test_y":test_y.to_dict()},f, ensure_ascii=False)

# # # =============================================== Predcition ===============================================
# # read post_datas
post_list = glob.glob(nowpath+'/script/attn/POST_DATA/낙동강*.csv')
preddata = pd.read_csv(nowpath+'/script/attn/POST_DATA/all_data.csv', encoding='cp949', index_col=0, parse_dates=True)
pred_input_cols = preddata.columns

predict_result = {}

for post_path in post_list:

    # try:
    point_name = post_path.split('\\')[-1].split('.')[0]
    # read test point data
    test_point_raw = pd.read_csv(post_path, encoding='cp949', index_col=0, parse_dates=True)

    # # slice period over 2023-01-01
    test_point_raw = test_point_raw.loc['2019-01-01':'2021-12-31']

    use_index = test_point_raw['유해남조류세포수'].dropna(axis=0).index

    # interpolate nan values in '유해남조류세포수'
    test_point_raw['유해남조류세포수'] = test_point_raw['유해남조류세포수'].interpolate(method='linear')

    # # apply log scale to '유해남조류세포수'
    # test_point_raw['유해남조류세포수'] = np.log(test_point_raw['유해남조류세포수'])

    # # fill nan values or -inf values with 0 in '유해남조류세포수'
    # test_point_raw['유해남조류세포수'] = test_point_raw['유해남조류세포수'].replace(-np.inf, 0)

    # make target column
    test_point_raw['유해남조류세포수_Y'] = test_point_raw['유해남조류세포수'].shift(Outshift)


    test_point = test_point_raw.copy()
    test_point = test_point[pred_input_cols]

    test_point = test_point.interpolate(method='linear')

    # print(test_point.shape)

    test_cols = test_point.columns
    test_indx = test_point.index

    # apply scaler 
    test_scaled = scaler.transform(test_point)

    test_scaled = pd.DataFrame(test_scaled, columns=test_cols, index=test_indx)

    # apply create_dataset function to test point data
    test_point = create_dataset(test_scaled, n_in=Inseq,n_out=0, dropnan=False)
    test_point = test_point.loc[use_index]
    test_point = test_point.dropna(axis=0)
    # print(test_point.shape)

    # reshape test point data
    test_point_input = test_point.values.reshape(test_point.shape[0], Inseq, x_features)

    # predict
    test_point_pred = model.predict(test_point_input)
    test_result = pd.DataFrame(test_point_pred, index=test_point.index, columns=['prediction'])
    rawd_result = test_point_raw.loc[test_point.index, ['유해남조류세포수_Y']]

    # # # inverse log
    # test_result['prediction_inv'] = test_result['prediction'].apply(lambda x: np.exp(x))
    # rawd_result['유해남조류세포수_Y_inv'] = rawd_result['유해남조류세포수_Y'].apply(lambda x: np.exp(x))

    # concat prediction and actual data
    test_result = pd.concat([test_result, rawd_result], axis=1)
    test_result.index = test_result.index.strftime('%Y-%m-%d')
    predict_result[point_name] = test_result.to_dict()
        # save prediction and actual data
        # test_result.to_csv('./model_attn/result/{}.csv'.format(point_name), encoding='cp949')

        # # plot the prediction
        # fig, ax = plt.subplots(figsize=(20, 5))
        # # ax.set_facecolor('white')
        # plt.plot(test_result['유해남조류세포수_Y_inv'], 'ko-', label='actual')
        # plt.plot(test_result['prediction_inv'], 'ro-', label='prediction')
        # plt.title(point_name)
        # plt.legend()

        # plt.savefig('./model_attn/result/{}.png'.format(point_name), facecolor='white', dpi=300)

    # except:
    #     # print(post_path)
    #     pass

with open(dir_loss+'/predictresult.json', 'w', encoding='utf-8') as f:
    json.dump(predict_result,f,ensure_ascii=False)

with open(dir_loss+'/status.config', 'w') as f:
    f.write('done')