from flask 				import Flask, render_template
from scipy.cluster.vq	import kmeans2
from sklearn			import preprocessing
import numpy as np
import pandas as pd
import json
import csv

DATA_PATH = "./data/"
app = Flask(__name__)

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
	df = pd.read_csv(file_name, sep=',', index_col="university_name").dropna()
	return df
	"""
	with open(file_name, 'rb') as file:
		read_data = list(csv.reader(file))

	headers, data = read_data[0], read_data[1:]
	return headers, data
	"""

def clean_normalize_data(df):
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

	df = pd.DataFrame(data_list)
	normalaized_data = preprocessing.scale(np.array(df).astype(np.float))
	return pd.DataFrame(normalaized_data)

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


if __name__ == "__main__":
	files = ["timesData.csv", "shanghaiData.csv", "cwurData.csv"]
	data = load_data(DATA_PATH + files[0])
	df = remove_columns(data, ["world_rank", "teaching", "country", "international_students", "female_male_ratio"])
	print list(df)
	df = clean_normalize_data(df)
	print list(df)
	#print df.values
	#print len(random_sampling(df))
	#print list(df)
	#np.array(df.values).astype(np.float)
	#df = random_sampling(data)
	#numerical_df = convert_to_numerical(df)
	#df = stratified_sampling(df)
	app.run(host='0.0.0.0', port=8000, debug=True)