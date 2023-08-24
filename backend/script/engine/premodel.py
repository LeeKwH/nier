import numpy as np
import pandas as pd


def array_2d_shift(shift_size, array_2d):

    """
        input : array_2d (Data length, x)

        output : shift_array ( Data length - shift_size, shift_size + 1, x)

    """

    shift_array = []

    for i in range(shift_size, len(array_2d)):
        shift_array.append(array_2d[i-shift_size:i+1])

    shift_array = np.array(shift_array)

    return shift_array





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