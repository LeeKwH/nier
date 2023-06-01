import torch
import torch.nn as nn

class ttttt(nn.Module):
    def __init__(self,list_inps):
        super(ttttt, self).__init__()
        inp = list_inps[0].size(1)
        self.seq_col1 = nn.Sequential(
        nn.Linear(inp, out_features=1,bias=True,),
        nn.Linear(1, out_features=1,bias=True,),
        nn.LazyLinear(out_features=7, bias=True),
)
        out_1 = self.seq_col1(list_inps[0])



    def forward(self, list_inps):
        out_1 = self.seq_col1(list_inps[0])


        return out_1
