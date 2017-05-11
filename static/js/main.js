
/* ========= Parameters =========== */
var VIS_YEAR = "2016";

/* ========= Master datas ========== */
var master_times_data = [];
var current_times_data = [];
var country_data = {};
d3.queue()
      .defer(d3.json, "/times_data")
      .await(function (error, data_json) {
        master_times_data = data_json.filter(function (d) {
                return d.year === VIS_YEAR;
            });
        current_times_data = JSON.parse(JSON.stringify(master_times_data));
        render_dashboard();
      });


/* Dashboard trigger */
function render_dashboard() {
    draw_map();
}

/* ========= MAP elements ========= */

var map_chart_div = d3.select("#map_chart_div");

var map_width  = +map_chart_div.attr("width"),
    map_height = +map_chart_div.attr("height"),
    map_active = d3.select(null);

var map_legend_rect_size = 10;
var map_legend_spacing = 2;

var map_projection = d3.geoMercator()
    .scale(map_width/6)
    .translate([map_width / 2, map_height / 2]);

var map_path = d3.geoPath()
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

var map_color = d3.scaleThreshold()
          .domain(d3.range(0, 10))
          .range(d3.schemeReds[9]);

var map_tooltip = d3.select("body").append("div")
                    .attr("class", "maptooltip")
                    .attr("width", map_width/10)
                    .attr("height", map_height/10)
                    .style("opacity", 0);

/* Ready country names and draw map*/
function draw_map() {
    country_id_to_name_map = {};
    d3.queue()
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
                                .data(color_domain)
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
                                    if (d < 0) {return "#ccc";}
                                    else {return map_color(d);}
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
  if (map_active.node() === this) return map_reset();
  map_active.classed("active", false);
  map_active = d3.select(this).classed("active", true);

  console.log(d3.select(this).attr("country_name"));

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
}

function map_reset() {
  map_active.classed("active", false);
  map_active = d3.select(null);

  map_g.transition()
      .duration(750)
      .style("stroke-width", ".5px")
      .attr("transform", "");
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
         .each(function(d) {
            this_el = d3.select(this);
            var country_name = this_el.attr("country_name");
            var country_color = "#ccc";
            if (!(country_name in country_data)) {
                country_color = "#ccc";
            } else {
                var cnt = country_data[country_name];
                if (cnt >= 100) {
                    country_color = map_color(9);
                } else if (cnt < 100 && cnt >= 50) {
                    country_color = map_color(6);
                } else if (cnt < 50 && cnt >= 25) {
                    country_color = map_color(5);
                } else if (cnt < 25 && cnt >= 10) {
                    country_color = map_color(3);
                } else {
                    country_color = map_color(0);
                }
            }
            this_el.attr("fill", country_color);
         });
}
