const width = document.getElementsByTagName('body')[0].offsetWidth;
const height = document.getElementsByTagName('body')[0].offsetHeight;
const mode = width > height ? "desktop" : "mobile"

const tooltip = d3.select('#tooltip');

let force_link;
let simulation;
let dragging = false;
const drag = () => {
  function dragstarted(event, d) {
    dragging = true;
    if (!event.active) simulation.alphaTarget(0.1).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
    dragging = false;
  }
  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

const node_radius = 5;
const link_length = 10;

const color_player = d3.scaleOrdinal(d3.range(1, 5), [`#FFFFFF`, `#C1B1F0`, `#FF7A00`, `#1A171B`])
  .unknown(`#00ff00`);
const color_player_muted = d3.scaleOrdinal(d3.range(1, 5), [`#C8FFF3`, `#B5E8EF`, `#C8D7A7`, `#83B9AF`])
  .unknown(`#00ff00`);
const reaction_types = d3.range(1, 3);
const color_reaction = d3.scaleOrdinal(reaction_types, [`#0CC6C6`, `#FF655D`])
  .unknown(`#00ff00`);
const color_reaction_muted = d3.scaleOrdinal(reaction_types, [`#7EEEE1`, `#C6D1C2`])
  .unknown(`#00ff00`);

const time_x = d3.scaleTime([new Date(2019, 6, 1), new Date(2021, 5, 30)], [-width/2, width/2])
const thai_date_from_string = str => {
  dmy = str.split("-")
  return new Date(+dmy[2] - 543, +dmy[1] - 1, +dmy[0])
}
const thai_date_to_string = date => {
  return new Date(date).toLocaleDateString("th-TH", {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

const bound_x = (x, centered=true) => Math.max(node_radius, Math.min(width - node_radius, x + (centered ? width/2 : 0)))
const bound_y = (y, centered=true) => Math.max(node_radius, Math.min(height - node_radius, y + (centered ? height/2 : 0)))

const svg = d3.select("svg");

// Arrowheads
const arrow_size = 5;
svg.append("defs")
  .selectAll("marker")
  .data(reaction_types)
  .join("marker")
    .attr("id", d => `arrow-${d}`)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10)
    .attr("markerWidth", arrow_size)
    .attr("markerHeight", arrow_size)
    .attr("orient", "auto")
    .append("path")
      .attr("fill", d => color_reaction(d))
      .attr("d", "M0,-5L10,0L0,5");
svg.append("defs")
  .selectAll("marker")
  .data(reaction_types)
  .join("marker")
    .attr("id", d => `arrow-${d}-muted`)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10)
    .attr("markerWidth", arrow_size)
    .attr("markerHeight", arrow_size)
    .attr("orient", "auto")
    .append("path")
      .attr("fill", d => color_reaction_muted(d))
      .attr("d", "M0,-5L10,0L0,5");

let node_sizes = {};
const radius_from_id = id => Math.sqrt(node_sizes[id]);

d3.csv(`[ELECT] Civil Movement Data - event_all.csv`).then(data => {
  let nodes = [];
  let links = [];
  let stems = [];
  let stem_ids = [];
  // let stem_nodes;

  data.sort((a, b) => thai_date_from_string(a.date) - thai_date_from_string(b.date))
  data.forEach((d, i) => {
    let id = d.event_no.trim();
    let date = thai_date_from_string(d.date)

    let node = { 
      id: id, 
      date: date, 
      name: d.event_name, 
      type: +d.player, 
      x: d["x_" + mode] ? (+d["x_" + mode] - 50)*width/100 : time_x(date) + Math.random(), 
      y: d["y_" + mode] ? (50 - +d["y_" + mode])*height/100 : (+d.time_show === 2) ? height/3 : Math.random()
    }
    nodes.push(node);
    node_sizes[id] = 1;

    if (d.pre_event != "") {
      let pres = d.pre_event.split(",");
      for (let pre of pres) {
        pre = pre.trim();
        links.push({ source: pre, target: id, value: +d.reaction_type });
        node_sizes[pre]++;
      }
    }

    stems.push({
      source: { x: time_x(date), y: height/2 },
      target: node,
      type: +d.player,
      shown: +d.time_show === 1 || +d.time_show === 2 // 1 for long line, 2 for short line
    });
    stem_ids.push(id);
  })
  
  force_link = d3.forceLink(links)
    .id(d => d.id)
    .distance(link_length)
    .distance(d => (radius_from_id(d.source.id) + radius_from_id(d.target.id))*node_radius + link_length)
    .strength(0.5);
  simulation = d3.forceSimulation(nodes)
    .force("link", force_link)
    .force("charge", d3.forceManyBodySampled()
      .strength(-0.2)
    )
    .force("collide", d3.forceCollide()
      .radius(d => (radius_from_id(d.id) + 1)*node_radius)
      .strength(0.2)
    )
    .tick(20)
  
  const link = svg.append("g")
    .selectAll("path")
    .data(links)
    .join("path")
      .attr("fill", "none")
      .attr("stroke-width", node_radius/4)
      .attr("stroke", d => color_reaction(d.value))
      .attr("marker-end", d => `url(${new URL(`#arrow-${d.value}`, location)})`);
  
  const stem = svg.append("g")
    .selectAll("path")
    .data(stems)
    .join("path")
      .attr("fill", "none")
      .attr("stroke-width", node_radius/4)
      .attr("stroke", d => color_player(d.type))
  
  const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
      .classed("node", true)
      .attr("fill", d => color_player(d.type))
      .attr("cx", d => bound_x(d.x))
      .attr("cy", d => bound_y(d.y))
      .call(drag())
    .on("mouseover", (event, d) => {
      // console.log(d);
      // tooltip.text(`${d.id}: ${d.name} (${thai_date_to_string(d.date)})`);

      link
        .attr("stroke", d => color_reaction_muted(d.value))
        .attr("marker-end", d => `url(${new URL(`#arrow-${d.value}-muted`, location)})`)
      stem
        .attr("stroke", d => color_player_muted(d.type))
        .filter(dd => dd.target.id === d.id)
          .raise()
          .attr("stroke", d => color_player(d.type))
          .attr("opacity", 1)
      node.attr("fill", d => color_player_muted(d.type))
      d3.select(event.currentTarget).attr("fill", d => color_player(d.type))
    })
    .on("mouseout", (event, d) => {
      if (!dragging) {
        link
          .attr("stroke", d => color_reaction(d.value))
          .attr("marker-end", d => `url(${new URL(`#arrow-${d.value}`, location)})`)
        stem
          .attr("stroke", d => color_player(d.type))
          .attr("opacity", d => d.shown ? 1 : 0)
        node.attr("fill", d => color_player(d.type))
      }
    });

  // node.transition()
  //   .delay((d, i) => i * 20)
  //   .duration(2000)
  //   .attrTween("r", d => {
  //     const i = d3.interpolate(0, node_radius);
  //     return t => i(t);
  //   });
  link.attr("opacity", 0)
    .transition()
    .delay((d, i) => i*15) //time_x(d.date)*100)
    .duration(1500)
    .attr("opacity", 1)
  stem.attr("opacity", 0)
    .transition()
    .delay((d, i) => i*15) //time_x(d.date)*100)
    .duration(1500)
    .attr("opacity", d => d.shown ? 1 : 0)
  node.transition()
    .delay((d, i) => i*15) //time_x(d.date)*100)
    .duration(1500)
    .attr("r", node_radius)
  
  simulation.on("tick", () => {
    link
      .attr("d", function(d) {
        return `M${bound_x(d.source.x)},${bound_y(d.source.y)} L${bound_x(d.target.x)},${bound_y(d.target.y)}`;
      });
    link
      .attr("d", function(d) {
        let m = this.getPointAtLength(this.getTotalLength() - node_radius);
        return `M${bound_x(d.source.x)},${bound_y(d.source.y)} L${bound_x(m.x, false)},${bound_y(m.y, false)}`;
      });

    stem
      .attr("d", d3.linkVertical()
        .source(d => d.source)
        .target(d => d.target)
        .x(d => bound_x(d.x))
        .y(d => bound_y(d.y))
      );
  
    node
      .attr("cx", d => bound_x(d.x))
      .attr("cy", d => bound_y(d.y))
  });
});