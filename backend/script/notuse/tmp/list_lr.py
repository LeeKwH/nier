
#layer categories
###################################################################################################################################################################################################################################################################
# ============================================================================= #
#  Layer types need info of in_feature number
list_lr_feature = ['Conv1d', 'Conv2d', 'Conv3d', 'ConvTranspose1d', 'ConvTranspose2d', 'ConvTranspose3d', #conv
               'AdaptiveLogSoftmaxWithLoss',#activ
               'BatchNorm1d', 'BatchNorm2d', 'BatchNorm3d', 'GroupNorm', 'SyncBatchNorm', 'InstanceNorm1d','InstanceNorm1d','InstanceNorm2d', 'InstanceNorm3d', #norm
               'RNN', 'LSTM', 'GRU', 'RNNCell', 'LSTMCell', 'GRUCell', #rnn
               'Linear' #linear
               ]
# ============================================================================= #
#  Layer types change tensor length
list_lr_length = ['Conv1d', 'Conv2d', 'Conv3d', 'ConvTranspose1d', 'ConvTranspose2d', 'ConvTranspose3d', #conv
                  'MaxPool1d', 'MaxPool2d', 'MaxPool3d', 'MaxUnPool1d', 'MaxUnPool2d', 'MaxUnPool3d', 'AvgPool1d', 'AvgPool2d', 'AvgPool3d', 'FractionalMaxPool2d', 'FractionalMaxPool3d', 'LPPool1d', 'LPPool2d', 'AdaptiveMaxPool1d', 'AdaptiveMaxPool2d', 'AdaptiveMaxPool3d', 'AdaptiveAvgPool1d', 'AdaptiveAvgPool2d', 'AdaptiveAvgPool3d', #pool
                  'ReflectionPad1d', 'ReflectionPad2d', 'ReflectionPad3d', 'ReplicationPad1d', 'ReplicationPad2d', 'ReplicationPad3d', 'ZeroPad2d', 'ConstantPad1d', 'ConstantPad2d', 'ConstantPad3d',#pad
                  'RNN', 'LSTM', 'GRU', 'RNNCell', 'LSTMCell', 'GRUCell', #rnn
               ]
# ============================================================================= #
#  Layer types change tensor dim
list_lr_dim = ['Fold', 'Unfold', 'Flatten', 'Unflatten']
# ============================================================================= #
#  Layer types of different dim
list_lr_2d = ['Conv1d', 'ConvTranspose1d', 'BatchNorm1d', 'InstanceNorm1d','MaxPool1d','MaxUnPool1d', 'AvgPool1d', 'RNN', 'LSTM',  'LSTMCell' #3D
                'Conv2d', 'ConvTranspose2d', 'BatchNorm2d', 'InstanceNorm2d', #4D
                'Conv3d', 'ConvTranspose3d', 'BatchNorm3d', 'InstanceNorm3d', #5D
                'SyncBatchNorm', #>2D
                ]
# ============================================================================= #
#  Layer types have an unique input order
list_lr_order = ['RNN', 'LSTM', 'GRU', 'LSTMCell'] #(N,L,H)
# ============================================================================= #
#  Layer types outside of nn.Module
list_lr_etc = ['extract_tensor', 'transpose_tensor']
'''
'Conv1d', 'ConvTranspose1d', 'BatchNorm1d', 'InstanceNorm1d', 'Conv2d', 'ConvTranspose2d', 'BatchNorm2d', 'InstanceNorm2d', 'Conv3d', 'ConvTranspose3d', 'BatchNorm3d', 'InstanceNorm3d', 'SyncBatchNorm',#(N,H,*)
'MaxPool1d', 'MaxPool2d', 'MaxPool3d', 'MaxUnPool1d', 'MaxUnPool2d', 'MaxUnPool3d', 'AvgPool1d', 'AvgPool2d', 'AvgPool3d', 'FractionalMaxPool2d', 'FractionalMaxPool3d', 'LPPool1d', 'LPPool2d', 'AdaptiveMaxPool1d', 'AdaptiveMaxPool2d', 'AdaptiveMaxPool3d', 'AdaptiveAvgPool1d', 'AdaptiveAvgPool2d', 'AdaptiveAvgPool3d',#(N,H,*)                
'ReflectionPad1d', 'ReflectionPad2d', 'ReflectionPad3d', 'ReplicationPad1d', 'ReplicationPad2d', 'ReplicationPad3d', 'ZeroPad2d', 'ConstantPad1d', 'ConstantPad2d', 'ConstantPad3d',#(N,H,*)
'Linear', 'GRUCell', 'RNNCell',#(N,H)
'''