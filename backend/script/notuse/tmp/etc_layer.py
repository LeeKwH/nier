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

class transpose_tensor(torch.transpose):
     def forward(self, x):
        #automatically used when the lstm layer encounters other layer types
        x_t = torch.transpose(x, dim0 = 0, dim1 = 1)
        return x_t 
