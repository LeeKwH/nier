import pandas as pd
import numpy as np



def get_rawtrn(path, encoding,indexcol):
    """
        Read raw train data set from file

        Args:
            path: path of raw train data set
            encoding: encoding of raw train data set
    """
    raw_trn = pd.read_csv(path, index_col=indexcol, encoding=encoding)
    raw_trn.index = pd.to_datetime(raw_trn.index, format='%Y-%m-%d')
    raw_trn = raw_trn.astype('float')
    return raw_trn



def get_usecols(model_input_cols_info):
    """
        Read use columns from file

        Args:
            model_input_cols_info: path of use columns file
    """
    use_cols = pd.read_csv(model_input_cols_info)
    use_cols = use_cols['cols'][use_cols['apply'] == 'True'].to_list()
    return use_cols



def get_target(data, predict_target, predict_period, usecols):
    """
        Get target columns from data

        Args:
            data: data set
            predict_target: target name ex) avg, day
            predict_period: target period ex)[10,15,20]
    """
    y_targets = []
    for per in predict_period:
        target = f'{predict_target}_er_{per}'
        if target in data.columns:
            y_targets.append(target)
    print("y_targets: ", y_targets)

    x_inputs = [item for item in usecols if 'avg' not in item and 'day' not in item]

    return x_inputs, y_targets


def assign_grade(value, devide_list, grades):
    """
        Assign grade by value

        Args:
            value: value to assign grade
        
        Example:
            df['grade'] = df['value'].apply(assign_grade)
    
    """
    for i, threshold in enumerate(devide_list):
        if value <= threshold:
            return grades[i]
    return grades[-1]



def get_most_frequent_class(row):
    """
        Get most frequent class from row

        Args:
            row: row of data set

        Example:
            df[y_targets] = df.apply(get_most_frequent_class, axis=1)

            y_targets: target columns
    """
    value_counts = row.value_counts()
    max_count = value_counts.max()
    max_classes = value_counts[value_counts == max_count].index.tolist()
    if len(max_classes) == 1:
        return max_classes[0]
    else:
        return min(max_classes)
    


# convert to nan if close and open value is zero
def convert_to_nan(row, close, open):
    """
        Convert to nan if close and open value is zero

        Args:
            row: row of data set

        Example:
            df = df.apply(convert_to_nan, axis=1)
    """
    if row[close] == 0 or row[open] == 0:
        row[close] = np.nan
    return row

