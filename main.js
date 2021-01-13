const width = document.getElementsByTagName('body')[0].offsetWidth;
const height = document.getElementsByTagName('body')[0].offsetHeight;

const tooltip = d3.select('#tooltip');

let force_link;
let charge_strength = -0.1;
let simulation;
const drag = simulation => {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.1).restart();
    d.fx = d.x;
    d.fy = d.y;
    // circle.filter(p => p === d).raise().attr("stroke", "black"))
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
    // circle.filter(p => p === d).attr("stroke", null))
  }
  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

const node_radius = 5;
const link_length = 10;

const color_player = d3.scaleOrdinal(d3.range(1, 5), [`#FFFFFF`, `#F5FFE0`, `#FF7A00`, `#1A171B`])
  .unknown(`#00ff00`);
const reaction_types = d3.range(1, 3);
const color_reaction = d3.scaleOrdinal(reaction_types, [`#07ABAB`, `#FF4036`])
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

let node_sizes = {};
const radius_from_id = id => Math.sqrt(node_sizes[id]);

d3.csv(`[ELECT] Civil Movement Data - event_all.csv`).then(data => {
  let nodes = [];
  let links = [];
  let stems = [];
  let stem_ids = [];
  let stem_nodes;

  data.sort((a, b) => thai_date_from_string(a.date) - thai_date_from_string(b.date))
  data.forEach((d, i) => {
    let id = d.event_no.trim();
    let date = thai_date_from_string(d.date)

    nodes.push({ 
      id: id, 
      date: date, 
      name: d.event_name, 
      type: +d.player, 
      x: time_x(date) + Math.random(), 
      y: (+d.time_show === 2) ? height/3 : Math.random()
    });
    // nodes.push({ id: id, name: d.event_name, type: +d.player, pre: d.pre_event, reaction: d.reaction_type });
    node_sizes[id] = 1;

    if (d.pre_event != "") {
      let pres = d.pre_event.split(",");
      for (let pre of pres) {
        pre = pre.trim();
        links.push({ source: pre, target: id, value: +d.reaction_type });
        node_sizes[pre]++;
      }
    }

    if (+d.time_show === 1 || +d.time_show === 2) { // 1 for long line, 2 for short line
      stems.push({ source: { x: time_x(date), y: height/2 }, target_id: id, type: +d.player });
      stem_ids.push(id);
    }
    stem_nodes = nodes.filter(d => stem_ids.includes(d.id)) // shallow copy
  })
  
  force_link = d3.forceLink(links)
    .id(d => d.id)
    .distance(link_length)
    .distance(d => (radius_from_id(d.source.id) + radius_from_id(d.target.id))*node_radius + link_length)
    .strength(0.5);
  simulation = d3.forceSimulation(nodes)
    .force("link", force_link)
    .force("charge", d3.forceManyBody()
      .strength(charge_strength)
    )
    .force("collide", d3.forceCollide()
      .radius(d => (radius_from_id(d.id) + 1)*node_radius)
      .strength(0.2)
    )
    .tick(10)
  
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
      // .attr("stroke", "black");
  
  const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
      .classed("node", true)
      .attr("fill", d => color_player(d.type))
      // .attr("r", node_radius)
      // .attr("r", d => radius_from_id(d.id)*node_radius)
      .attr("cx", d => bound_x(d.x))
      .attr("cy", d => bound_y(d.y))
      .call(drag(simulation))
    .on("mouseover", (event, d) => {
      // console.log(d);
      // tooltip.text(`${d.id}: ${d.name} (${thai_date_to_string(d.date)})`);
      link.attr("opacity", 0.5)
      stem.attr("opacity", 0.5)
      node.attr("opacity", 0.5)
      d3.select(event.currentTarget).attr("opacity", 1)
    })
    .on("mouseout", (event, d) => {
      link.attr("opacity", 1)
      link.attr("opacity", 1)
      stem.attr("opacity", 1)
      node.attr("opacity", 1)
    });

  // node.transition()
  //   .delay((d, i) => i * 20)
  //   .duration(2000)
  //   .attrTween("r", d => {
  //     const i = d3.interpolate(0, node_radius);
  //     return t => i(t);
  //   });
  node.transition()
    .delay((d, i) => i*20) //time_x(d.date)*100)
    .duration(2000)
    .attr("r", node_radius);
  
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

    for (let i = 0; i < stems.length; i++) {
      let n = stem_nodes.find(d => d.id === stems[i].target_id)
      stems[i].target = { x: n.x, y: n.y }
    }
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