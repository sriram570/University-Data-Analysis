from flask 						import Flask, render_template, jsonify, current_app
from scipy.cluster.vq			import kmeans2
from sklearn					import preprocessing

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import mpld3
import json
import csv

DATA_PATH = "./data/"
app = Flask(__name__)
app.debug=True

@app.route("/")
def index():
	return render_template("index.html")

def remove_columns(data, columns):
	"""
	removes the specified columns from the dataFrame

	@data: dataFrame
	@columns: list of column names to be removed
	"""
	df = pd.DataFrame(data)
	df.drop(columns, axis=1, inplace=True)
	return df

def load_data(file_name):
	"""
	loads csv data and returns dataFrame

	@file_name: csv input file
	"""
	df = pd.read_csv(file_name, sep=',').dropna()
	return df
	"""
	with open(file_name, 'rb') as file:
		read_data = list(csv.reader(file))

	headers, data = read_data[0], read_data[1:]
	return headers, data
	"""

def clean_normalize_data(df, normalize=True):
	"""
	cleans and normalizes data and returns dataFrame

	@df: dataFrame 
	"""
	data_list = df.values.tolist()
	for i, row in enumerate(data_list):
		for j, value in enumerate(row):
			try:
				data_list[i][j] = float(value)
			except ValueError:
				if value == '-':
					data_list[i][j] = 50
				elif ',' in value:
					data_list[i][j] = float(value.replace(',',''))
				elif '-' in value:
					data_list[i][j] =  float(value.split('-')[0])
				elif '=' in value:
					data_list[i][j] = float(value.split('=')[1])

	df = pd.DataFrame(data_list)
	if not normalize:
		return df
	normalized_data = preprocessing.scale(np.array(df).astype(np.float))
	return pd.DataFrame(normalized_data)

def random_sampling(df, no_samples=500):
	"""
	performs random sampling and returns sampled data
	"""
	df = df.sample(no_samples)
	return df

def convert_to_numerical(df):
	cols_to_transform = ['university_name', 'country', 'international_students']
	# convert categorical variable into dummy/indicator variables
	numerical_df = pd.get_dummies(df, columns=cols_to_transform)
	#print list(numerical_df)
	return numerical_df

@app.route('/university_by_regions_plot')
def university_by_regions_plot(df):
	"""
	plots the number of universities region-wise

	@df dataFrame with categorical data
	"""
	id_count_by_region = df.groupby('country')['world_rank'].count()
	id_count_by_region.sort_values(na_position='last', inplace=True, ascending=False)
	fig = plt.figure(figsize=(14, 8))
	id_count_by_region[:10].plot(kind='barh', title='Universities by Region')
	#plt.show()
	#mpld3.show()
	#return jsonify(result=mpld3.fig_to_dict(fig))

def parallel_coordinates(df):
	"""
	writes all numerical attributes to a csv file
	"""
	cols_to_remove = ['university_name', 'international_students', 'female_male_ratio', 'country']
	outfile = DATA_PATH + "pc.csv"
	df = remove_columns(df, cols_to_remove)
	rem_cols = list(df)
	#print list(df)
	df = clean_normalize_data(df, normalize=False)
	np.savetxt(outfile, np.asarray(df), delimiter=",", header=",".join(rem_cols), comments="")

if __name__ == "__main__":
	files = ["timesData.csv", "shanghaiData.csv", "cwurData.csv"]
	data = load_data(DATA_PATH + files[0])
	university_by_regions_plot(data)
	parallel_coordinates(data)
	#print list(data)
	df = remove_columns(data, ["university_name", "country", "international_students", "female_male_ratio"])
	df = clean_normalize_data(df)

	#print df.values
	#print len(random_sampling(df))
	#print list(df)
	#np.array(df.values).astype(np.float)
	#df = random_sampling(data)
	#numerical_df = convert_to_numerical(df)
	#df = stratified_sampling(df)
	app.run(host='0.0.0.0', port=10001, debug=True)
