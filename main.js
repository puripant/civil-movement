// // Get URL parameters
// const queryStringRegEx = query => new RegExp(`[?|&]${query}=([^&]*)`);
// const url = window.location.search;
// let matches = url.match(queryStringRegEx("data"));
// const data_group = matches ? matches[1] : "คณะราษฎร";

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
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

const node_radius = 5;
const link_length = 10;

const volume_to_charge_strength = d3.scalePow().exponent(2)
  .domain([0, 1])
  .range([-0.1, -1000])

const color_player = d3.scaleOrdinal(d3.range(1, 5), [`#FFFFFF`, `#F5FFE0`, `#FF7A00`, `#1A171B`])
  .unknown(`#00ff00`);
const reaction_types = d3.range(1, 3);
const color_reaction = d3.scaleOrdinal(reaction_types, [`#07ABAB`, `#FF4036`])
  .unknown(`#00ff00`);

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

d3.csv(`data/[ELECT] Civil Movement Data - event_all.csv`).then(data => {
  let nodes = [];
  let links = [];
  data.forEach((d, i) => {
    let id = d.event_no.trim();
    nodes.push({ id: id, name: d.event_name, type: +d.player });
    // nodes.push({ id: id, name: d.event_name, type: +d.player, pre: d.pre_event, reaction: d.reaction_type });
    node_sizes[id] = 1;

    if (d.pre_event != "") {
      let pres = d.pre_event.split(",");
      for (let pre of pres) {
        pre = pre.trim();
        links.push({ source: pre, target: d.event_no, value: +d.reaction_type });
        node_sizes[pre]++;
      }
    }
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
  
  const link = svg.append("g")
    .selectAll("path")
    .data(links)
    .join("path")
      .attr("fill", "none")
      .attr("stroke-width", node_radius/4)
      .attr("stroke", d => color_reaction(d.value))
      .attr("marker-end", d => `url(${new URL(`#arrow-${d.value}`, location)})`);
  
  const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
      .attr("fill", d => color_player(d.type))
      .attr("r", node_radius)
      // .attr("r", d => radius_from_id(d.id)*node_radius)
      .call(drag(simulation))
    .on("mouseover", (event, d) => {
      // console.log(d);
      tooltip.text(`${d.id}: ${d.name}`);
    });
  
  simulation.on("tick", () => {
    link
      .attr("d", function(d) {
        return `M${d.source.x + width / 2},${d.source.y + height / 2} L${d.target.x + width / 2},${d.target.y + height / 2}`;
      });
    link
      .attr("d", function(d) {
        let m = this.getPointAtLength(this.getTotalLength() - node_radius);
        return `M${d.source.x + width / 2},${d.source.y + height / 2} L${m.x},${m.y}`;
      });
    // link
    //   .attr("x1", d => d.source.x + width / 2)
    //   .attr("y1", d => d.source.y + height / 2)
    //   .attr("x2", d => d.target.x + width / 2)
    //   .attr("y2", d => d.target.y + height / 2);
  
    node
      .attr("cx", d => d.x + width / 2)
      .attr("cy", d => d.y + height / 2);
  });
});

// // Audio
// window.AudioContext = window.AudioContext || window.webkitAudioContext;
// let context = new AudioContext();

// if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//   navigator.mediaDevices.getUserMedia({ audio: true })
//   .then((stream) => {
//     let mediaStreamSource = context.createMediaStreamSource(stream);
//     let meter = createAudioMeter(context);
//     mediaStreamSource.connect(meter);
//   })
//   .catch((err) => {
//     console.log(err);
//   });
// }

// function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
//   const processor = audioContext.createScriptProcessor(512)
//   processor.onaudioprocess = volumeAudioProcess
//   processor.clipping = false
//   processor.lastClip = 0
//   processor.volume = 0
//   processor.clipLevel = clipLevel || 0.98
//   processor.averaging = averaging || 0.95
//   processor.clipLag = clipLag || 750

//   processor.connect(audioContext.destination)

//   processor.checkClipping = function () {
//     if (!this.clipping) {
//       return false
//     }
//     if ((this.lastClip + this.clipLag) < window.performance.now()) {
//       this.clipping = false
//     }
//     return this.clipping
//   }

//   processor.shutdown = function () {
//     this.disconnect()
//     this.onaudioprocess = null
//   }

//   return processor
// }

// function volumeAudioProcess(event) {
//   const buf = event.inputBuffer.getChannelData(0);
//   const bufLength = buf.length;
  
//   let sum = 0;
//   for (var i = 0; i < bufLength; i++) {
//     let x = buf[i]
//     if (Math.abs(x) >= this.clipLevel) {
//       this.clipping = true
//       this.lastClip = window.performance.now()
//     }
//     sum += x * x
//   }
//   const rms = Math.sqrt(sum / bufLength)
//   this.volume = Math.max(rms, this.volume * this.averaging)
  
//   if (Math.abs(charge_strength - volume_to_charge_strength(this.volume)) > 10) {
//     charge_strength = volume_to_charge_strength(this.volume);
//     simulation
//       .force("link", force_link)
//       .force("charge", d3.forceManyBody()
//         .strength(charge_strength)
//       )
//     simulation.alphaTarget(0.1).restart();
//     console.log("changed")
//   }
// }