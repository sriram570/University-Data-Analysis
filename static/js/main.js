
/* ========= Parameters =========== */
var VIS_YEAR = "2016";

/* ========= Master datas ========== */
var master_times_data = [];
var current_times_data = [];
var country_data = {};
d3_queue.queue()
      .defer(d3.json, "/times_data")
      .await(function (error, data_json) {
        master_times_data = data_json.filter(function (d) {
                return d.year === VIS_YEAR;
            }).map(function (d) {
                if (d.world_rank[0] === "=") {
                    d.world_rank = d.world_rank.substr(1);
                }
                d.world_rank = parseInt(d.world_rank);
                return d;
            });
        current_times_data = JSON.parse(JSON.stringify(master_times_data));
        render_dashboard();
      });


/* Dashboard trigger */
function render_dashboard() {
    draw_map();
    draw_pie_chart();
    draw_pc();
}

/* Helper functions */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

/* =========== Slider ============ */

function get_rank_range_data() {
  var rank_range = document.getElementById('ex2').getAttribute('value');
    rank_range = rank_range.split(",").map(function(d) {return parseInt(d);});
    return master_times_data.filter(function (d) {
        return (d.world_rank >= rank_range[0] && d.world_rank <= rank_range[1]);
        });
}

function range_slider_fn() {
    current_times_data = get_rank_range_data();
    color_map();
    update_pie_chart();
    update_pc();
}
$("#ex2").slider({})
    .on('change', range_slider_fn)
    .data('slider');

/* ========= MAP elements ========= */

var map_chart_div = d3.select("#map_chart_div");

var map_width  = +map_chart_div.attr("width"),
    map_height = +map_chart_div.attr("height"),
    map_active = d3.select(null);

var map_legend_rect_size = 10;
var map_legend_spacing = 2;

var map_projection = d3.geo.mercator()
    .scale(map_width/6)
    .translate([map_width / 2, map_height / 2]);

var map_path = d3.geo.path()
    .projection(map_projection);

var map_svg = map_chart_div.append("svg")
    .attr("id", "map_chart_svg")
    .attr("width", map_width)
    .attr("height", map_height);

map_svg.append("rect")
    .attr("class", "map_background")
    .attr("fill", "white")
    .attr("width", map_width)
    .attr("height", map_height)
    .on("click", map_reset);

var map_g = map_svg.append("g")
    .style("stroke-width", ".5px");

var map_colors = ["#67000d", "#a50f15", "#cb181d", "#fb6a4a", "#fee0d2", "#ccc"];

var map_tooltip = d3.select("body").append("div")
                    .attr("class", "maptooltip")
                    .attr("width", map_width/10)
                    .attr("height", map_height/10)
                    .style("opacity", 0);

var map_selected = "World";

/* Ready country names and draw map*/
function draw_map() {
    country_id_to_name_map = {};
    d3_queue.queue()
          .defer(d3.json, "/country_id_to_name_map")
          .await(function (error, mapping_json) {
            for (var i = 0; i < mapping_json.length; i++) {
              country_id_to_name_map[mapping_json[i]["country-code"]] = mapping_json[i]["name"];
            }

            d3.json("/world_map", function(error, world) {
              if (error) throw error;

              var color_domain = [9,6,5,3,0,-1];
              var color_exps = [">100", "50 - 100", "25 - 50", "10 - 25", "<10", "Zero/No data"]
              var legend = map_g.selectAll('.legend')
                                .data(map_colors)
                                .enter()
                                .append('g')
                                .attr('class', 'legend')
                                .attr('transform', function(d, i) {
                                    var lgd_height = map_legend_rect_size + map_legend_spacing;
                                    var horz = 1 * map_legend_rect_size;
                                    var vert = (map_height/2) + (i * lgd_height);
                                    return 'translate(' + horz + ',' + vert + ')';
                                });
                         legend.append('rect')
                                .attr('width', map_legend_rect_size)
                                .attr('height', map_legend_rect_size)
                                .style('fill', function(d) {
                                    return d;
                                });
                          legend.append('text')
                                .attr('x', map_legend_rect_size + (2*map_legend_spacing))
                                .attr('y', map_legend_rect_size - map_legend_spacing)
                                .style('font-size', '8px')
                                .text(function(d, i) { return color_exps[i]; });

              map_g.selectAll("path")
                  .data(topojson.feature(world, world.objects.countries).features)
                .enter().append("path")
                  .attr("country_name", function(d) {return country_id_to_name_map[d.id];})
                  .attr("d", map_path)
                  .attr("class", "mapfeature")
                  .style("fill", "#ccc")
                  .on("click", map_clicked)
                  .on("mouseover", map_mouseover)
                  .on("mouseout", map_mouseout);

              map_g.append("path")
                  .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
                  .attr("class", "mesh")
                  .attr("d", map_path);

              /* Drawing done, color the map now */
              color_map();
            });
        });  
}

function map_clicked(d) {
  var country_name = d3.select(this).attr("country_name");

  if (!(country_name in country_data)) {
    return;
  }
  if (map_active.node() === this) return map_reset();
  map_active.classed("active", false);
  map_active = d3.select(this).classed("active", true);

  current_times_data = get_rank_range_data();
  current_times_data = current_times_data.filter(function(d) {
    return (d.country === country_name);
  });

  var bounds = map_path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = .9 / Math.max(dx / map_width, dy / map_height),
      translate = [map_width / 2 - scale * x, map_height / 2 - scale * y];

  map_g.transition()
      .duration(750)
      .style("stroke-width", .5 / scale + "px")
      .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
  d3.select(this).moveToFront();
  d3.select(this).transition()
                 .duration(750)
                 .style("stroke", "yellow")
                 .style("stroke-width", (2.5 / scale) + "px");

  map_selected = country_name;
  update_pie_chart();
  update_pc();
}

function map_reset() {
  map_active.classed("active", false);
  map_active = d3.select(null);

  current_times_data = get_rank_range_data();
  console.log(current_times_data.length);

  map_g.transition()
      .duration(750)
      .style("stroke-width", ".5px")
      .attr("transform", "");
  
  d3.selectAll(".mapfeature").transition()
                 .duration(750)
                 .style("stroke", "white")
                 .style("stroke-width", ".5px");

  map_selected = "World";
  update_pie_chart();
  update_pc();
}

function map_mouseover() {
  this_el = d3.select(this);
  var country_name = this_el.attr("country_name");
  map_tooltip.transition().duration(100).style("opacity", 1);
  map_tooltip.html(country_name + ": " + (country_data[country_name] || 0))
         .style("left", (d3.event.pageX + 5) + "px")
         .style("top", (d3.event.pageY - 15) + "px");
}

function map_mouseout() {
  map_tooltip.transition().duration(100).style("opacity", 0);
}

function color_map() {
    country_data = {};
    current_times_data.map(function (d) {
        country_data[d.country] = (country_data[d.country] || 0) + 1;
    });
    map_g.selectAll(".mapfeature")
         .transition()
         .duration(500)
         .style("fill", function(d, i) {
            return get_color(d3.select(this));
        });
    function get_color(d) {
        var country_name = d.attr("country_name");
        var country_color = map_colors[5]; //#ccc
        if (!(country_name in country_data)) {
            country_color = map_colors[5]; //"#ccc";
        } else {
            var cnt = country_data[country_name];
            if (cnt >= 100) {
                country_color = map_colors[0];
            } else if (cnt < 100 && cnt >= 50) {
                country_color = map_colors[1];
            } else if (cnt < 50 && cnt >= 25) {
                country_color = map_colors[2];
            } else if (cnt < 25 && cnt >= 10) {
                country_color = map_colors[3];
            } else {
                country_color = map_colors[4];
            }
        }
        return country_color;
    }
    
}


/* ========= Pie chart elements ========= */

var pie_chart = null;

function draw_pie_chart() {
  pie_chart = new d3pie("pie_chart_div", {
                  header: {
                    title: {
                      text: map_selected,
                      fontSize: "25"
                    },
                    location: "top-center",
                  },
                  size: {
                    canvasHeight: 290,
                    canvasWidth: 350,
                    pieInnerRadius: "60%"
                  },
                  data: {
                    content: generate_pie_data()
                  }
                });
}

function update_pie_chart() {
  pie_chart.destroy();
  draw_pie_chart();
}

function generate_pie_data() {
  var research_work = get_research_count();
  return [
          { label: "Very High", value: research_work[0] },
          { label: "High", value: research_work[1] },
          { label: "Medium", value: research_work[2] },
          { label: "Low", value: research_work[3] },
          { label: "Very Low", value: research_work[4] }
          ]
}

function get_research_count() {
  var research = [0,0,0,0,0];
  current_times_data.map(function(d) {
    r = +d.research;
    research[4 - parseInt(r/20)] += 1;
  });
  return research;
}

/* ========= PC elements ========= */
function data_helper() {
  var new_data = current_times_data.map(function (d) {
    cols = ["world_rank", "teaching", "research", "citations", "international", "total_score"];
    arr = []
    new_d = {}
    for (var i = 0; i < cols.length; i++) {
        if (d[cols[i]] == '-')
          new_d[cols[i]] = Math.random() * (60 - 30) + 40;
        else
          new_d[cols[i]] = parseFloat(d[cols[i]]);
    }
    return new_d;
  });
  return new_data;
}

var pc_div = d3.select("#pc_div");

var pc_margin = {top: 30, right: 10, bottom: 10, left: 10},
    width = 1200 - pc_margin.left - pc_margin.right,
    height = 350 - pc_margin.top - pc_margin.bottom;

var x = d3.scale.ordinal().rangePoints([0, width], 1),
    y = {},
    dragging = {};

var pc_line = d3.svg.line(),
    axis = d3.svg.axis().orient("left"),
    background,
    foreground;

var pc_parent_svg = pc_div.append("svg")
    .attr("id", "pc_svg")
    .attr("width", width + pc_margin.left + pc_margin.right)
    .attr("height", height + pc_margin.top + pc_margin.bottom);

var pc_svg = pc_parent_svg.append("g")
                          .attr("transform", "translate(" + pc_margin.left + "," + pc_margin.top + ")");

function draw_pc() {

    pc_times_data = data_helper();

    // Extract the list of dimensions and create a scale for each.
    x.domain(dimensions = d3.keys(pc_times_data[0]).filter(function(d) {
      return y[d] = d3.scale.linear()
          .domain(d3.extent(pc_times_data, function(p) { return +p[d]; }))
          .range([height, 0]);
    }));

    // Add grey background lines for context.
    background = pc_svg.append("g")
        .attr("class", "background")
      .selectAll("path")
        .data(pc_times_data)
      .enter().append("path")
        .attr("d", path);

    // Add blue foreground lines for focus.
    foreground = pc_svg.append("g")
        .attr("class", "foreground")
      .selectAll("path")
        .data(pc_times_data)
      .enter().append("path")
        .attr("d", path);

    // Add a group element for each dimension.
    var g = pc_svg.selectAll(".dimension")
        .data(dimensions)
      .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
        .call(d3.behavior.drag()
          .origin(function(d) { return {x: x(d)}; })
          .on("dragstart", function(d) {
            dragging[d] = x(d);
            background.attr("visibility", "hidden");
          })
          .on("drag", function(d) {
            dragging[d] = Math.min(width, Math.max(0, d3.event.x));
            foreground.attr("d", path);
            dimensions.sort(function(a, b) { return position(a) - position(b); });
            x.domain(dimensions);
            g.attr("transform", function(d) { return "translate(" + position(d) + ")"; })
          })
          .on("dragend", function(d) {
            delete dragging[d];
            transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
            transition(foreground).attr("d", path);
            background
                .attr("d", path)
              .transition()
                .delay(500)
                .duration(0)
                .attr("visibility", null);
          }));

    // Add an axis and title.
    g.append("g")
        .attr("class", "axis")
        .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(function(d) { return d; });

    // Add and store a brush for each axis.
    g.append("g")
        .attr("class", "brush")
        .each(function(d) {
          d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushstart", brushstart).on("brush", brush));
        })
        .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);


  function position(d) {
    var v = dragging[d];
    return v == null ? x(d) : v;
  }

  function transition(g) {
    return g.transition().duration(500);
  }

  // Returns the path for a given data point.
  function path(d) {
    return pc_line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));
  }

  function brushstart() {
    d3.event.sourceEvent.stopPropagation();
  }

  // Handles a brush event, toggling the display of foreground lines.
  function brush() {
    var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
        extents = actives.map(function(p) { return y[p].brush.extent(); });
    foreground.style("display", function(d) {
      return actives.every(function(p, i) {
        return extents[i][0] <= d[p] && d[p] <= extents[i][1];
      }) ? null : "none";
    });
  }
}

function update_pc() {
  console.log("here");
  pc_svg.remove();
  pc_svg = pc_parent_svg.append("g")
                          .attr("transform", "translate(" + pc_margin.left + "," + pc_margin.top + ")");
  draw_pc();
}