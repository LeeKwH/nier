import json, copy, sys, os

sys.path.append('./')
nowpath = os.getcwd()

user_name = sys.argv[1]
model_name = sys.argv[2]

dir_script = f'{nowpath}/.user/{user_name}/.model/{model_name}/'
modelinfo = json.load(open(dir_script+'modelinfo.json', encoding='UTF8'))

seqshf = modelinfo['seqshf']
Inseq = seqshf['Input Sequence']
Outseq = seqshf['Output Sequence']
Inshift = seqshf['Input Shift']
Outshift = seqshf['Output Shift']

input = modelinfo['variable']['1']
outs = modelinfo['variable']['out']

jsonlink = modelinfo['link']
jsonmodel = modelinfo['model']
jsoncolrow = {x[2]:[x[1],x[0]] for x in modelinfo['colrow']}
deep_link = copy.deepcopy(jsonlink)
cols = {}
mers = {}

for link in jsonlink:
    if 'input' in link['source']:
        cols[link['source'][-1]] = [link['target']]
        deep_link.remove(link)
    elif 'Merge' in link['source']:
        mers[link['source']]={'row':0,'list_cols':[],'following_sequential':[link['target']]}
        deep_link.remove(link)

jsonlink = deep_link

for key in mers.keys():
    for source in mers[key]['following_sequential']:
        for link in modelinfo['link']:
            if source == link['source'] and 'Merge' not in link['target']:
                mers[key]['following_sequential'].append(link['target'])
                deep_link.remove(link)
            elif source == link['source'] and 'Merge' in link['target']:
                deep_link.remove(link)

for link in deep_link:
    if 'Merge' not in link['target']:
        cols[link['id'].split(',')[0].split('e')[-1]].append(link['target'])

for key in cols.keys():
    layerlist = []
    for layer in cols[key]:
        for model in jsonmodel:
            if layer == model['newc']:
                arg = model['data']
                for k,v in arg.items():
                    if v == 'True' : arg[k] = True
                    elif v == 'False' : arg[k] = False
                layerlist.append({'type':model['type'],'coord':jsoncolrow[layer],'arg':arg})

    cols[key] = sorted(layerlist, key=lambda x: x['coord'][0])

    for idx,target in enumerate(cols[key]):
        args = list(target['arg'].keys())
        outre = [s for s in args if s in ['out_features','out_channels','hidden_size']]
        if idx == 0:
            target['in'] = -1
        else:
            target['in'] = cols[key][idx-1]['out']
        if outre:
            outarg = outre[0]
            target['out'] = target['arg'][outarg]
        else:
            target['out'] = target['in']

for key in mers.keys():
    mers[key]['row'] = jsoncolrow[key][0]
    layerlist = []
    for layer in mers[key]['following_sequential']:
        for model in jsonmodel:
            if model['newc'] == key:
                mers[key]['list_cols'] = model['merge']
            if layer == model['newc']:
                arg = model['data']
                for k,v in arg.items():
                    if v == 'True' : arg[k] = True
                    elif v == 'False' : arg[k] = False
                layerlist.append({'type':model['type'],'coord':jsoncolrow[layer],'arg':arg})
    mers[key]['following_sequential'] = sorted(layerlist, key=lambda x: x['coord'][0])

    for idx,target in enumerate(mers[key]['following_sequential']):
        args = list(target['arg'].keys())
        outre = [s for s in args if s in ['out_features','out_channels','hidden_size']]
        if idx == 0:
            target['in'] = len(mers[key]['list_cols'])*Outseq
        else:
            target['in'] = mers[key]['following_sequential'][idx-1]['out']
        if outre:
            outarg = outre[0]
            target['out'] = target['arg'][outarg]
        else:
            target['out'] = target['in']

with open(f'{dir_script}layerinfo.json','w',encoding='utf-8') as f:
    json.dump({'cols':cols,'mers':mers},f)

print('Script saved in %s'%dir_script,end='')