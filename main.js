// Get URL parameters
const queryStringRegEx = query => new RegExp(`[?|&]${query}=([^&]*)`);
const url = window.location.search;
let matches = url.match(queryStringRegEx("data"));
const data_group = matches ? matches[1] : "คณะราษฎร";

const width = document.getElementsByTagName('body')[0].offsetWidth;
const height = document.getElementsByTagName('body')[0].offsetHeight;

const tooltip = d3.select('#tooltip');

const drag = simulation => {
  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.1).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }
  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// event_no,event_name,pre_event,reaction_type,player,date,location,cause,proposal,key_topic,hashtag,tag
// รหัสเหตุการณ์,
// ชื่อเหตุการณ์,
// เหตุการณ์ก่อนหน้าที่ทำให้เกิดเหตุการณ์นี้ (ใส่ event_no),
// "ความสัมพันธ์กับเหตุการณ์ก่อนหน้า 1 = support, 2 = anti",
// "คนจัด 1=เยาวชน, 2=ประชาชน, 3=พรรคการเมือง, 4=รัฐบาล",
// วันที่เกิดเหตุการณ์,
// สถานที่,
// วัตถุประสงค์,
// ข้อเรียกร้องหลัก,"1=ความยุติธรรม/ตุลาการ, 2=ขับไล่รัฐบาล, 3=แก้รัฐธรรมนูญ, 4=ปฏิรูปสถาบัน, 5=ม็อบไม่มีแกนนำ (อาจจะไม่มีก็ได้)",
// hashtag ของม๊อบ,
// จัดกลุ่มหัวข้อ (ใช้เป็น tag หน้าเว็บในการเสิร์ช)

const node_radius = 5;
const link_length = 10;

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

d3.csv(`data/[ELECT] Civil Movement Data - event_จักรวาล${data_group}.csv`).then(data => {
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
  
  const simulation = d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody()
      .strength(-0.1)
    )
    .force("link", d3.forceLink(links)
      .id(d => d.id)
      .distance(link_length)
      .distance(d => (radius_from_id(d.source.id) + radius_from_id(d.target.id))*node_radius + link_length)
      .strength(0.5)
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
    .on("mouseover", d => {
      console.log(d);
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