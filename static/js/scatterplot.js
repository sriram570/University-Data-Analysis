function draw_scatterplot() {
	var scatter_plot_div = d3.select("#scatter_plot");

	var width = 960,
		size = 230,
		padding = 20;

	var x = d3.scale.linear()
		.range([padding / 2, size - padding / 2]);

	var y = d3.scale.linear()
		.range([size - padding / 2, padding / 2]);

	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom")
		.ticks(6);

	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")
		.ticks(6);

	var color = d3.scale.category10();

	d3.csv("./static/data/pca_top4.csv", function(error, data) {
	  if (error) throw error;

	  var domainByTrait = {},
		  traits = d3.keys(data[0]).filter(function(d) { return d; }),
		  n = traits.length;

	  traits.forEach(function(trait) {
		domainByTrait[trait] = d3.extent(data, function(d) { return +d[trait]; });
	  });

	  xAxis.tickSize(size * n);
	  yAxis.tickSize(-size * n);

	  var brush = d3.svg.brush()
		  .x(x)
		  .y(y)
		  .on("brushstart", brushstart)
		  .on("brush", brushmove)
		  .on("brushend", brushend);

	  var svg = scatter_plot_div.append("svg")
			.attr("id", "scatter_plot_div")
			.attr("width", size * n + padding)
			.attr("height", size * n + padding)
			.append("g")
			.attr("transform", "translate(" + padding + "," + padding / 2 + ")");

	  svg.selectAll(".x.axis")
		  .data(traits)
		.enter().append("g")
		  .attr("class", "x axis")
		  .attr("transform", function(d, i) { return "translate(" + (n - i - 1) * size + ",0)"; })
		  .each(function(d) { x.domain(domainByTrait[d]); d3.select(this).call(xAxis); });

	  svg.selectAll(".y.axis")
		  .data(traits)
		.enter().append("g")
		  .attr("class", "y axis")
		  .attr("transform", function(d, i) { return "translate(0," + i * size + ")"; })
		  .each(function(d) { y.domain(domainByTrait[d]); d3.select(this).call(yAxis); });

	  var cell = svg.selectAll(".cell")
		  .data(cross(traits, traits))
		.enter().append("g")
		  .attr("class", "cell")
		  .attr("transform", function(d) { return "translate(" + (n - d.i - 1) * size + "," + d.j * size + ")"; })
		  .each(plot);

	  // Titles for the diagonal.
	  cell.filter(function(d) { return d.i === d.j; }).append("text")
		  .attr("x", padding)
		  .attr("y", padding)
		  .attr("dy", ".71em")
		  .text(function(d) { return d.x; });

	  cell.call(brush);

	  function plot(p) {
		var cell = d3.select(this);

		x.domain(domainByTrait[p.x]);
		y.domain(domainByTrait[p.y]);

		cell.append("rect")
			.attr("class", "frame")
			.attr("x", padding / 2)
			.attr("y", padding / 2)
			.attr("width", size - padding)
			.attr("height", size - padding);

		cell.selectAll("circle")
			.data(data)
		  .enter().append("circle")
			.attr("cx", function(d) { return x(d[p.x]); })
			.attr("cy", function(d) { return y(d[p.y]); })
			.attr("r", 2)
			.style("fill", function(d) { return color(d.species); });
	  }

	  var brushCell;

	  // Clear the previously-active brush, if any.
	  function brushstart(p) {
		if (brushCell !== this) {
		  d3.select(brushCell).call(brush.clear());
		  x.domain(domainByTrait[p.x]);
		  y.domain(domainByTrait[p.y]);
		  brushCell = this;
		}
	  }

	  // Highlight the selected circles.
	  function brushmove(p) {
		var e = brush.extent();
		svg.selectAll("circle").classed("hidden", function(d) {
		  return e[0][0] > d[p.x] || d[p.x] > e[1][0]
			  || e[0][1] > d[p.y] || d[p.y] > e[1][1];
		});
	  }

	  // If the brush is empty, select all circles.
	  function brushend() {
		if (brush.empty()) svg.selectAll(".hidden").classed("hidden", false);
	  }
	});

	function cross(a, b) {
	  var c = [], n = a.length, m = b.length, i, j;
	  for (i = -1; ++i < n;) for (j = -1; ++j < m;) c.push({x: a[i], i: i, y: b[j], j: j});
	  return c;
	}

}

function draw_screeplot() {

var scree_plot_div = d3.select("#scree_plot");

// Set the dimensions of the canvas / graph
var	margin = {top: 50, right: 50, bottom: 50, left: 50},
	width = 600 - margin.left - margin.right,
	height = 270 - margin.top - margin.bottom;

// Set the ranges
var	x = d3.scale.linear().range([0, width]);
var	y = d3.scale.linear().range([height, 0]);

// Define the axes
var	xAxis = d3.svg.axis().scale(x)
	.orient("bottom").ticks(5);

var	yAxis = d3.svg.axis().scale(y)
	.orient("left").ticks(5);

// Define the line
var	valueline = d3.svg.line()
	.x(function(d) { return x(d.x); })
	.y(function(d) { return y(d.y); });

var colorScale = d3.scale.category10();

// Adds the svg canvas
var	svg = scree_plot_div.append("svg")
	.attr("id", "scree_plot_div")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Get the data
d3.csv("./static/data/pca_scree.csv", function(error, data) {
	data.forEach(function(d) {
		d.x = +d.x;
		d.y = +d.y;
	});

	// Scale the range of the data
	x.domain([0, d3.max(data, function(d) { return d.x; })]);
	y.domain([0, d3.max(data, function(d) { return d.y; })]);

	// Add the valueline path.
	svg.append("path")
		.attr("class", "line")
		.attr("d", valueline(data));

	// Add the X Axis
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis)
		.append("text")
		.attr("fill", "#000")
		.attr("x", width/2-60)
		.attr("y", 40)
		.text("Principal Components");

	// Add the Y Axis
	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis)
		.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", -30)
		.attr("x", -((height/2+40)))
		.text("Eigen values");

	svg.selectAll("circle")
		.data([{'x':4, 'y':1.0062}])
		.enter()
		.append("circle")
		.attr("r", 8)
		.attr("cx", function(d){
		    return x(d.x);
		})
		.attr("fill", function(d, i) {return colorScale(d.x)})
		.attr("cy", function(d){
		    return y(d.y);
		});

	svg.append("line")
		.attr("x1", x(0))
		.attr("y1", y(1))
		.attr("x2", x(10))
		.attr("y2", y(1))
		.attr("stroke-width", 2)
		.attr("stroke", colorScale(x));

});
}


function draw_2d_plot(attr1, attr2) {
	$('#scatter').empty();
	var scatter = d3.select("#scatter");

	var margin = {top: 20, right: 20, bottom: 30, left: 40},
	    width = 560 - margin.left - margin.right,
	    height = 300 - margin.top - margin.bottom;

	// setup x 
	var xValue = function(d) { return +d[attr1];}, // data -> value
	    xScale = d3.scale.linear().range([0, width]), // value -> display
	    xMap = function(d) { return xScale(xValue(d));}, // data -> display
	    xAxis = d3.svg.axis().scale(xScale).orient("bottom");

	// setup y
	var yValue = function(d) { return +d[attr2];}, // data -> value
	    yScale = d3.scale.linear().range([height, 0]), // value -> display
	    yMap = function(d) { return yScale(yValue(d));}, // data -> display
	    yAxis = d3.svg.axis().scale(yScale).orient("left");

	// setup fill color
	var cValue = function(d) { return "#00FFFF";},
	    color = d3.scale.category10();

	// add the graph canvas to the body of the webpage
	var svg = scatter.append("svg")
		.attr("id", 'scatter')
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	    .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// add the tooltip area to the webpage
	var tooltip = d3.select("body").append("div")
	    .attr("class", "tooltip")
	    .style("opacity", 0)
	    .style("color", "#000000");

	// load data
	d3.csv("./static/data/timesData.csv", function(error, data) {

	  // change string (from CSV) into number format
	  data.forEach(function(d) {
	    d['attr1'] = +d['attr1'];
	    d['attr2'] = +d['attr2'];
	//    console.log(d);
	  });

	  // don't want dots overlapping axis, so add in buffer to data domain
	  xScale.domain([d3.min(data, xValue)-1, d3.max(data, xValue)+1]);
	  yScale.domain([d3.min(data, yValue)-1, d3.max(data, yValue)+1]);

	  // x-axis
	  svg.append("g")
	      .attr("class", "x axis")
	      .attr("transform", "translate(0," + height + ")")
	      .call(xAxis)
	    .append("text")
	      .attr("class", "label")
	      .attr("x", width)
	      .attr("y", -6)
	      .style("text-anchor", "end")
	      .text(attr1);

	  // y-axis
	  svg.append("g")
	      .attr("class", "y axis")
	      .call(yAxis)
	    .append("text")
	      .attr("class", "label")
	      .attr("transform", "rotate(-90)")
	      .attr("y", 6)
	      .attr("dy", ".71em")
	      .style("text-anchor", "end")
	      .text(attr2);

	  // draw dots
	  svg.selectAll(".dot")
	      .data(data)
	    .enter().append("circle")
	      .attr("class", "dot")
	      .attr("r", 2)
	      .attr("cx", xMap)
	      .attr("cy", yMap)
	      .style("fill", function(d) { return color(cValue(d));}) 
	      .on("mouseover", function(d) {
	          tooltip.transition()
	               .duration(200)
	               .style("opacity", .9);

	          tooltip.html(d["university_name"] + "<br/> (" + xValue(d) 
		        + ", " + yValue(d) + ")")
	               .style("left", (d3.event.pageX + 5) + "px")
	               .style("top", (d3.event.pageY - 28) + "px");
	      })
	      .on("mouseout", function(d) {
	          tooltip.transition()
	               .duration(500)
	               .style("opacity", 0);
	      });

	});
}


draw_screeplot()
draw_scatterplot()
draw_2d_plot("income", "num_students")