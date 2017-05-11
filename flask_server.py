from flask                      import Flask, render_template, jsonify, current_app
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
app = Flask(__name__)
app.debug=True

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/world_map")
def world_map():
    return json.dumps(json.load(open(DATA_PATH + "world_110m.json")))

@app.route("/country_id_to_name_map")
def country_id_to_name_map():
    return json.dumps(json.load(open(DATA_PATH + "country_id_to_name_map.json")))

@app.route("/times_data")
def times_data():
    with open(DATA_PATH + "timesData.csv") as f:
        return json.dumps([{k: v for k, v in row.items()}
                            for row in csv.DictReader(f, skipinitialspace=True)])

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=10002, debug=True)