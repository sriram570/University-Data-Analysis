from flask                      import Flask, render_template, jsonify, current_app, request
from scipy.cluster.vq           import kmeans2
from sklearn                    import preprocessing

#import matplotlib.pyplot as plt
import numpy as np
#import seaborn as sns
import pandas as pd
import mpld3
import json
import csv

DATA_PATH = "./data/"
DATA_PATH_2 = "./static/data/"
app = Flask(__name__)
app.debug=True

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/world_map")
def world_map():
    return json.dumps(json.load(open(DATA_PATH + "world_110m.json")))

@app.route("/charts")
def charts():
	return render_template("charts.html")

@app.route("/country_id_to_name_map")
def country_id_to_name_map():
    return json.dumps(json.load(open(DATA_PATH + "country_id_to_name_map.json")))

@app.route("/times_data")
def times_data():
    with open(DATA_PATH + "timesData.csv") as f:
        return json.dumps([{k: v for k, v in row.items()}
                            for row in csv.DictReader(f, skipinitialspace=True)])

@app.route('/load_universities', methods = ['GET','POST'])
def load_universities():
	timesData = pd.read_csv(DATA_PATH + "timesData.csv")
	shanghaiData = pd.read_csv(DATA_PATH + "shanghaiData.csv")
	cwurData = pd.read_csv(DATA_PATH + "cwurData.csv")
	univ_list = []
	for univ in timesData['university_name']:
		if univ in [univ_2 for univ_2 in shanghaiData['university_name'].values]:
			if univ in [univ_3 for univ_3 in cwurData['institution'].values]:
				univ_list.append(univ)

	return jsonify(result=univ_list)

@app.route('/time_series', methods = ['GET','POST'])
def time_series():
	json = request.get_json()

	# university name (to be made dynamic later)
	my_university_name = json
	my_university_name = [my_university_name]
	
	timesData = pd.read_csv(DATA_PATH + "timesData.csv")
	shanghaiData = pd.read_csv(DATA_PATH + "shanghaiData.csv")
	cwurData = pd.read_csv(DATA_PATH + "cwurData.csv")

	all_university_names = set(timesData.university_name).union(set(shanghaiData.university_name)).union(set(cwurData.institution))
	all_university_names_list = [str(i) for i in (list(all_university_names))]

	times_plot_data = timesData[timesData.university_name.isin(my_university_name)][['world_rank','year']]
	shanghai_plot_data = shanghaiData[shanghaiData.university_name.isin(my_university_name)][['world_rank','year']]
	cwur_plot_data = cwurData[cwurData.institution.isin(my_university_name)][['world_rank','year']]

	times_plot_data['source'] = 'Times'
	shanghai_plot_data['source'] = 'Shanghai'
	cwur_plot_data['source'] = 'CWUR'

	# parse the first number in rank for data ranges
	times_plot_data['world_rank'] = times_plot_data['world_rank'].map(lambda x: x.lstrip('-'))

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


	with open(DATA_PATH_2 + json + "_time_series.csv",'wb') as resultFile:
	    wr = csv.writer(resultFile)
	    wr.writerows(data_to_write)

	return jsonify(result="Done!")


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=10002, debug=True)