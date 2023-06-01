// interpolation 0:interpolation 1:dropna 2:removenoise
// const list_interpolation = [['linear', 'time', 'index', 'values','nearest', 'zero', 'slinear', 'quadratic', 'cubic', 'krogh', 'pchip', 'akima', 'cubicspline'],['any','all'],['binning', 'regression', 'clustering', 'outlier']];
// transformation 0:Scaling 1:Binarize 2:Function
// const list_transformation = [['standard','minmax','norm','z-score'],['Binarizer', 'labelbinarizer', 'multilabelbinarizer'],['log10', 'log2', 'ln', 'sigmoid', 'tanh']];
// reduction 0:Row-wise 1:Column-wise
// const list_reduction = [['randomsampling', 'stratifiedsampling'],['forward-selection', 'columnmax', 'columnmean', 'pca']];

const Sampling={
    'RandomSampling':"strnumrow",
    'KeySampling':"column"
}
const FeatureSelection={
    'LinearRegression':"column",
    'Ridge':"column",
    'LogisticRegression':"column",
    'Perceptron':"column",
}
const ColumnSummary={
    'mean':"",
    'amax':"",
    'amin':"",
}
const ColumnPCA={
    'auto':"strnum",
    'full':"strnum",
    'arpack':"strnum",
    'randomize':"strnum",
}
const InterpolUnivar={
    'linear':"",
    'time':"",
    'index':"",
    'pad':"",
    'nearest':"",
    'zero':"",
    'slinear':"",
    'quadratic':"",
    'cubic':"",
    'barycentric':"",
    'krogh':"",
    'piecewise_polynomial':"",
    'pchip':"",
    'akima':"",
    'cubicspline':"",
    'spline':"strnum10",
    'polynomial':"strnum10",
}
const fillna={
    'bfill':"",
    'pad':"",
    'ffill':"",
    'zero':"",
}
const dropna={
    'any':"",
    'all':"",
}
const Scaling={
    'MaxAbsScaler':"",
    'MinMaxScaler':"",
    'RobustScaler':"",
    'StandardScaler':"",
    'Normalizer':"",
}
const Function={
    'sin':"",
    'cos':"",
    'tan':"",
    'sinh':"",
    'cosh':"",
    'tanh':"",
    'exp':"",
    'expm1':"",
    'exp2':"",
    'log':"",
    'log10':"",
    'log2':"",
    'sqrt':"",
    'square':"",
    'sign':"",
}

export {Sampling,FeatureSelection,ColumnSummary,ColumnPCA,InterpolUnivar,fillna,dropna,Scaling,Function};