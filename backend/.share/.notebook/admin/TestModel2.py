import torch
import torch.nn as nn

class last(nn.Module):
    def __init__(self,list_inps):
        super(last, self).__init__()
        inp = list_inps[0].size(1)
        self.seq_col1 = nn.Sequential(
        nn.Linear(in_features = inp, out_features=8,bias=True,),
        nn.Linear(in_features=8, out_features=4,bias=True,),
        nn.Linear(in_features=4, out_features=2,bias=True,),
        nn.Linear(in_features=2, out_features=1,bias=True,),
)
        out_1 = self.seq_col1(list_inps[0])



    def forward(self, list_inps):
        out_1 = self.seq_col1(list_inps[0])
        out_1 = self.seq_col1(list_inps[0])


        return out_1
