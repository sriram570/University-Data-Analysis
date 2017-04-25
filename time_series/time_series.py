
my_university_name = ["University of Cambridge"]

import csv
import numpy as np # linear algebra
import pandas as pd # data processing, CSV file I/O (e.g. pd.read_csv)
import matplotlib.pyplot as plt

timesData = pd.read_csv("./data/timesData.csv")
shanghaiData = pd.read_csv("./data/shanghaiData.csv")
cwurData = pd.read_csv("./data/cwurData.csv")

all_university_names = set(timesData.university_name).union(set(shanghaiData.university_name)).union(set(cwurData.institution))
all_university_names_list = [str(i) for i in (list(all_university_names))]

times_plot_data = timesData[timesData.university_name.isin(my_university_name)][['world_rank','year']]
shanghai_plot_data = shanghaiData[shanghaiData.university_name.isin(my_university_name)][['world_rank','year']]
cwur_plot_data = cwurData[cwurData.institution.isin(my_university_name)][['world_rank','year']]

times_plot_data['source'] = 'Times'
shanghai_plot_data['source'] = 'Shanghai'
cwur_plot_data['source'] = 'CWUR'

# parse the first number in rank for data ranges
times_plot_data['world_rank'] = times_plot_data['world_rank'].str.split('-').str[0]
shanghai_plot_data['world_rank'] = shanghai_plot_data['world_rank'].str.split('-').str[0]

plot_data = times_plot_data.append(shanghai_plot_data).append(cwur_plot_data)
plot_data['world_rank'] = plot_data['world_rank'].astype(int)

times, shanghai, cwur = {}, {}, {}
for row in plot_data.values:
	if row[2] == 'Times':
		times[row[1]] = row[0]
	elif row[2] == 'Shanghai':
		shanghai[row[1]] = row[0]
	elif row[2] == 'CWUR':
		cwur[row[1]] = row[0]

max_len_map = times if len(times) > len(shanghai) else shanghai
max_len_map = cwur if len(cwur) > max_len_map else max_len_map

# header
data_to_write = [['Year', 'Times', 'Shanghai', 'CWUR']]
for year in max_len_map:
	if year in times and year in shanghai and year in cwur:
		data_to_write.append([year, times[year], shanghai[year], cwur[year]])


print times
print shanghai
print cwur

print data_to_write

with open("time_series.csv",'wb') as resultFile:
    wr = csv.writer(resultFile)
    wr.writerows(data_to_write)