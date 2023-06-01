import sys, os
import torch
import torch.nn as nn
sys.path.append('./')
nowpath = os.getcwd()


class extract_tensor(nn.Module):
    def forward(self,x):
        # Output shape (batch, features, hidden)
        tensor, _ = x
        # Reshape shape (batch, hidden)
        return tensor[:, -1, :]

# class transpose_tensor(torch.transpose):
class transpose_tensor(nn.Module):
     def forward(self, x):
        #automatically used when the lstm layer encounters other layer types
        x_t = torch.transpose(x, dim0 = 1, dim1 = 2)
        return x_t


# for lstm -> lstm return output
class GetToLSTMOutput(nn.Module):
    def forward(self, x):
        output,(ht1, ct1)  = x
        return output