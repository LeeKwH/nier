"""

    Description:

    This file contains the core of the engine.
    - Deep learning model is defined in this file.

"""
import torch 
import torch.nn as nn
from torch.nn import functional as F


class extract_tensor(nn.Module):
    """
        To extract final result from LSTM
    """
    def forward(self,x):
        # # Output shape (batch, features, hidden)
        tensor, _ = x
        # Reshape shape (batch, hidden)
        return tensor[:, -1, :]
    
# class transpose_tensor(torch.transpose):
class transpose_tensor(nn.Module):
     def forward(self, x):
        #automatically used when the lstm layer encounters other layer types
        x_t = torch.transpose(x, dim0 = 1, dim1 = 2)
        return x_t    
    
class GetToOutput(nn.Module):
    """
        To extract result from multiple ouput layer that is used input for other layer
    """
    def forward(self, x):
        output,_  = x
        return output
    

    

class AttentionLSTM(nn.Module):
    def __init__(self, input_size,out_size):
        super(AttentionLSTM, self).__init__()
        self.hidden_size = 220
        self.num_layer = 1
        self.lstm = nn.LSTM(input_size, self.hidden_size, batch_first=True)
        self.attention = nn.Linear(self.hidden_size, self.hidden_size)
        self.fc = nn.Linear(self.hidden_size, out_size)

    def forward(self, x):
        h0 = torch.zeros(self.num_layer, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layer, x.size(0), self.hidden_size).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        
        attention_weights = F.softmax(self.attention(out), dim=1)
        attended = torch.bmm(attention_weights.transpose(1, 2), out)
        out = self.fc(attended[:, -1, :]) 

        return out

    

class EarlyStopping:
    def __init__(self, patience=10, delta=0):
        self.patience = patience
        self.delta = delta
        self.counter = 0
        self.best_loss = None
        self.early_stop = False

    def __call__(self, val_loss):
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss > self.best_loss + self.delta:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            self.best_loss = val_loss
            self.counter = 0