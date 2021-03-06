/*
 * This file contains the majority of the JavaScript on the website.
 */
'use strict';

//Global variables
var wrapper, canvas, output, moveSpeed, turnSpeed, moveSpeedDisplay, turnSpeedDisplay, createButton, simulateButton, exportButton, xElem, yElem, changeMode, modeDisplay, tokenField, loadToken;
var fileName, opModeName;
var towRedButton;
var ctx, width, height;
var snapTo = 'y';
var robot;
var lastX, lastY;
var background = new Image()
var nodes = [];
var currentAngle;

//Constants
const GREEN = '#32a852';
const RED = '#db3125';
const GREY = '#cfcfcf';
const ORANGE = '#ed9924';
const PURPLE = '#a42bcc';
const END = `        }
    }
}`;
const INDENTSPACE = '            ';

//Milimeters / Pixels
const mmPerPixel = 6.096;

//Wait for page to load
$(document).ready(() => {

  //Get elements
  canvas = document.getElementById('canvas');
  wrapper = $('#wrapper');
  output = $('#output');
  moveSpeed = $('#move-speed');
  turnSpeed = $('#turn-speed');
  moveSpeedDisplay = $('#move-speed-display');
  turnSpeedDisplay = $('#turn-speed-display');
  createButton = $('#create');
  simulateButton = $('#simulate');
  exportButton = $('#export');
  xElem = $('#x');
  yElem = $('#y');
  changeMode = $('#change-mode');
  modeDisplay = $('#mode-display');
  tokenField = $('#token-field');
  loadToken = $('#load-token')

  //Get action buttons
  towRedButton = $('#towRedButton');

  //Create empty robot
  robot = void(0);

  //Load page
  wrapper.css('display', 'inherit');

  //Canvas setup
  ctx = canvas.getContext('2d');
  width = canvas.width;
  height = canvas.height;
  background.src = 'images/field.png';
  background.style.width = '50%';
  background.style.height = 'auto';

  //Mouse coordinates relative to the top left corner of the canvas
  var mouseX = 0;
  var mouseY = 0;

  //Node that is currently being moved
  var selectedNode = void(0);

  //Misc state variables
  var didStartPath = false;
  var createMode = true;
  var isMovingNode = false;
  var isShiftDown = false;

  //Handle keyboard events
  canvas.addEventListener('keydown', function(e){

    e.preventDefault();

    switch (e.key) {
      case 'Shift':
        isShiftDown = true;
        return;
        break;
      case 'Backspace':

        //Check if user is creating nodes
        if (createMode) return;

        //Check which mode is being deleted
        for (let n in nodes){
          let node = nodes[n];

          //Calculate distance from center
          let deltaX = mouseX - node.x;
          let deltaY = mouseY - node.y;
          if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) <= node.radius){
            if (nodes.indexOf(node) === 0){
              nodes.shift();
              nodes[0].color = GREEN;
            }else if (nodes.indexOf(node) === nodes.length - 1){
              nodes.pop();
              node = nodes[nodes.length - 1];
              node.nextNode = void(0);
              node.color = RED;
            }else{
              nodes.splice(n, 1);
              nodes[n - 1].nextNode = nodes[n];
              return;
            }
          }
        }
      default:
        return;
    }
    return;
  });
  canvas.addEventListener('keyup', function(e){
    if (e.key !== 'Shift') return;
    isShiftDown = false;
  });

  //Change mode based on button click
  changeMode.click(function(){

    //Check if user is creating nodes and switch
    if (createMode){
      createMode = false;
      color(createMode);
    }else{
      createMode = true;
      color(createMode);
      selectedNode = void(0);
      clearEditMode();
    }
  });

  //Handle mouse events
  canvas.addEventListener('click', function(e){
    if (createMode){
      if (mouseX > 600 || mouseX < 0 || mouseY > 600 || mouseY < 0) return;

      //Create node
      let node = new Node(ctx, mouseX, mouseY);
      if (nodes.length <= 0) node.color = GREEN;
      nodes.push(node);
      if (didStartPath){
        nodes[nodes.length - 2].nextNode = node;
      }

      didStartPath = true;
    }
  });
  canvas.addEventListener('mousedown', function(e){

    //Make sure it is in edit mode before editing
    if (createMode) return;

    //Get mouse coordinates according to top left of canvas
    var x = e.pageX - canvas.offsetLeft;
    var y = e.pageY - canvas.offsetTop;

    //Check which mode is being moved
    for (let n in nodes){
      let node = nodes[n];

      //Calculate distance from center
      let deltaX = x - node.x;
      let deltaY = y - node.y;
      if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) <= node.radius){

        //Select node
        if (selectedNode && typeof selectedNode !== 'undefined'){
          selectedNode.outlineColor = '#000';
        }else{
          displayEditor();
        }
        selectedNode = node;
        selectedNode.outlineColor = '#14dbdb';
        loadNode(selectedNode);
        isMovingNode = true;
        break;
      }
    }
  });
  canvas.addEventListener('mouseup', function(){
    if (createMode) return;
    isMovingNode = false;
  });
  canvas.addEventListener('mousemove', function(e){

    //Get mouse coordinates according to top left of canvas
    var x = e.pageX - canvas.offsetLeft;
    var y = e.pageY - canvas.offsetTop;
    xElem.text(x);
    yElem.text(y);
    mouseX = x;
    mouseY = y;

    //Snap to closest axis
    if (isShiftDown && nodes.length > 0 && createMode){
      let n = nodes[nodes.length - 1];
      let deltaX = Math.abs(mouseX - n.x);
      let deltaY = Math.abs(mouseY - n.y);
      let theta = Math.atan(deltaY / deltaX) * (180 / Math.PI);
      if (theta <= 45){
        mouseY = n.y;
        snapTo = 'x';
      } else {
        mouseX = n.x;
        snapTo = 'y';
      }
    }

    if (createMode || !isMovingNode || typeof selectedNode === 'undefined' || !selectedNode) return;
    updateCoordsOnly();

    //Click and drag
    selectedNode.x = x;
    selectedNode.y = y;
  });

  //Actions
  towRedButton.click(function(){
    nodes = nodes.concat(towRed(ctx));
    calcOrder();
  });

  //Main draw loop
  setInterval(function(){
    ctx.drawImage(background, 0, 0);

    //Draw snapping lines
    if (createMode){
      if (isShiftDown && nodes.length > 0){
        let node = nodes[nodes.length - 1];
        ctx.strokeStyle = '#d1d132';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.setLineDash([10, 10]);
        ctx.moveTo(node.x, node.y);
        if (snapTo === 'y'){
          ctx.lineTo(node.x, node.y + 600);
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(node.x, node.y - 600)
          ctx.stroke();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(node.x, mouseY, 9, 0, 2 * Math.PI, false);
          ctx.fillStyle = GREY;
          ctx.fill();
          ctx.stroke();
        }else{
          ctx.lineTo(node.x + 600, node.y);
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(node.x - 600, node.y)
          ctx.stroke();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(mouseX, node.y, 9, 0, 2 * Math.PI, false);
          ctx.fillStyle = GREY;
          ctx.fill();
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }else{
        if (nodes[0] && typeof nodes[0] !== undefined){
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(mouseX, mouseY, 9, 0, 2 * Math.PI, false);
          ctx.fillStyle = GREY;
          ctx.fill();
          ctx.stroke();
        }else{
          ctx.strokeStyle = '#0f0';
          let size = 457.2 / mmPerPixel;
          ctx.strokeRect(mouseX - size / 2, mouseY - size / 2, size, size);
        }
      }
    }

    //Draw all nodes
    color(createMode);
    for (let node of nodes){
      node.draw();
    }
    if (robot) robot.draw();
  }, 80 / 1000);

  //Create the file on button click
  createButton.click(createFile);

  //Simulate the robot's path
  simulateButton.click(async function(){
    var instructions = createFile();
    if (typeof instructions === 'undefined') return;
    instructions.pop()

    //Loop through all instructions
    for (let i of instructions){
      var instruction = decodeInstruction(i);

      if (!(['turn', 'drive', 'strafe'].includes(instruction[0]))) continue;

      if (instruction.length === 3){
        await robot[instruction[0]](instruction[1], instruction[2]);
      }else{
        console.log(instruction);
      }

    }
  });

  //Export the path as an action
  exportButton.click(function(){
    var out = [];
    for (let node of nodes){
      if (node instanceof ActionNode){
        out.push(`new ActionNode(ctx, ${node.x}, ${node.y}, '${node.action}', ${node.speedToNextNode})`);
      }else{
        out.push(`new Node(ctx, ${node.x}, ${node.y}, ${node.speedToNextNode})`);
      }
    }
    let o = JSON.stringify(out, null, 2);
    o = o.replace(/"/g, '');
    output.val(o);
    output.height($("textarea")[0].scrollHeight);
  });

  //Load token into project
  loadToken.click(function(){
    if (nodes.length > 0){
      if (!window.confirm('You already have nodes in the project, would you like to overwrite them?')) return;
    }
    nodes = [];
    nodes = decodeNodeToken(tokenField.val(), ctx);
    calcOrder();
  });
});

//Change robot speeds
function changeMoveSpeed(value){
  if (robot && typeof robot != 'undefined'){
    robot.speed = (value * mmPerPixel) / (80 / 100);
  }
  moveSpeedDisplay.text(value);
}
function changeTurnSpeed(value){
  if (robot && typeof robot != 'undefined'){
    robot.turnSpeed = value;
  }
  turnSpeedDisplay.text(value);
}

//Calculates node order and connects them
function calcOrder(){
  for (let n = 0; n < nodes.length; n++){
    if (n === nodes.length - 1) return;
    nodes[n].nextNode = nodes[n + 1]
  }
}

//Create the file
function createFile(){

  //Get field values
  fileName = $('#file-name').val()
  opModeName = $('#opmode-name').val()
  if (fileName === '' || opModeName === '' || !fileName || !opModeName){
    return window.alert('You must provide both an OpMode name and a file name.');
  }
  var middle = '', token = `${$('#file-name').val()}<>${$('#opmode-name').val()}#<$>#`;
  currentAngle = findDegrees(nodes[0], nodes[1]);
  if (nodes[0].speedToNextNode < 0){
    currentAngle += 180;
  }

  //Initialize robot
  robot = new Robot(ctx, currentAngle, nodes);
  robot.speed = (moveSpeed.val() * mmPerPixel) / (80 / 100);
  robot.turnSpeed = turnSpeed.val();

  var didStrafeToNext = false;

  //Do math for nodes
  for (let n in nodes){
    let node = nodes[n];
    let nextNode = node.nextNode ? node.nextNode : void(0);
    let twoNodes = nextNode && nextNode.nextNode ? nextNode.nextNode : void(0);
    var d, theta;

    //Calculate distance
    if (nextNode && typeof nextNode !== 'undefined'){
      d = distance(node.x, nextNode.x, node.y, nextNode.y);
      if (d && !didStrafeToNext){
        middle += `${INDENTSPACE}this.drive(${d * mmPerPixel * 10}, ${node.speedToNextNode});\n`; //Times 10 to account for Owen's factor issue
      }
    }

    didStrafeToNext = false;

    //Calculate angle between next node and node after
    if ((nextNode && typeof nextNode !== 'undefined') && (twoNodes && typeof twoNodes !== 'undefined')){
      theta = currentAngle - findDegrees(nextNode, twoNodes);
      if (nextNode.speedToNextNode < 0){
        theta += 180;
      }
    }

    //Strafing
    if ([90, 270, -90, 270].includes(theta) && n !== 0 && n !== nodes.length - 1 && (nextNode && typeof nextNode !== 'undefined') && (twoNodes && typeof twoNodes !== 'undefined')){
      didStrafeToNext = true;
      d = distance(nextNode.x, twoNodes.x, nextNode.y, twoNodes.y);
      if (theta === -90 || theta === 270){
        middle += `${INDENTSPACE}this.strafe(Dir.RIGHT, ${d * mmPerPixel * 10}, 1.0);\n`;
      }else{
        middle += `${INDENTSPACE}this.strafe(Dir.LEFT, ${d * mmPerPixel * 10}, 1.0);\n`;
      }
    }else{
      if (theta && typeof theta !== 'undefined'){
        currentAngle -= theta;
        middle += `${INDENTSPACE}this.turn(${theta}, 1.0);\n`;
      }
    }

    //Run any actions
    if (node && typeof node !== 'undefined' && node.hasAction && node.action && typeof node.action !== 'undefined' && node.action !== ''){
      middle += `${INDENTSPACE}${node.action}\n`;
    }
  }

  //Create token
  for (let node of nodes){
    token += createNodeTokenPart(node);
  }

  let t = token.split('#<$>#');
  t.pop();
  token = t.join('#<$>#');

  //Add begining of file
  var begining = `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;

@Autonomous(name="${opModeName}")
public class ${fileName} extends SPQRLinearOpMode {

  @Override
  public void runOpMode() {
      this.hardwareInit();

      waitForStart();

      if (opModeIsActive() && !isStopRequested()) {

${INDENTSPACE}//AUTO GENERATED CODE
${INDENTSPACE}//TOKEN: ${btoa(token)}
`;

  output.val(begining + middle + END)
  output.height($("textarea")[0].scrollHeight);
  return middle.split('\n');
}

//Color the nodes
function color(createMode){

  if (nodes.length <= 0) return;

  //Check if user is creating nodes
  if (!createMode){

    modeDisplay.text('edit');

    //Color edit mode
    for (let node of nodes){
      if (!node.hasAction){
        node.color = PURPLE;
      }else{
        node.color = ORANGE;
      }
    }
    nodes[0].color = GREEN;
    nodes[nodes.length - 1].color = RED;
  }else{

    modeDisplay.text('create');

    //Color create mode
    for (let node of nodes){
      if (!node.hasAction){
        node.color = GREY;
      }else{
        node.color = ORANGE;
      }
      node.outlineColor = '#000';
    }
    nodes[0].color = GREEN;
  }
}

//Decode an instruction from the file
function decodeInstruction(i){
  var instruction = i.trim();
  instruction = instruction.replace(';', '');
  instruction = instruction.replace('this.', '');
  var decodedInstruction = [];
  instruction = instruction.split('(');
  decodedInstruction.push(instruction.shift());
  instruction = instruction[0];
  instruction.replace(')', '');
  instruction = instruction.split(', ');;
  var firstPart = instruction.shift();
  var thing = parseFloat(firstPart, 10);
  decodedInstruction.push((isNaN(firstPart)) ? firstPart : thing);
  decodedInstruction.push(parseFloat(instruction.shift(), 10));
  if (instruction.length > 0){
    decodedInstruction.push(parseFloat(instruction.shift(), 10));
  }
  return decodedInstruction;
}

//Create node token
function createNodeTokenPart(node){
  return `${node.x}/~?~/${node.y}/~?~/${node.speedToNextNode}${(node.hasAction) ? `/~?~/${node.action}` : ''}#<$>#`;
}

//Decode node token
function decodeNodeToken(token, ctx){
  let decodedToken = atob(token);
  var nodeArray = [];
  let nodeTokenPart = decodedToken.split('#<$>#');
  let names = nodeTokenPart.shift().split('<>');
  $('#file-name').val(names.shift());
  $('#opmode-name').val(names.shift());
  for (let tokenPart of nodeTokenPart){
    let nodeComponents = tokenPart.split('/~?~/');
    if (nodeComponents.length === 4){
      let newNode = new ActionNode(ctx, parseFloat(nodeComponents[0], 10), parseFloat(nodeComponents[1], 10), nodeComponents[3]);
      newNode.speedToNextNode = nodeComponents[2];
      nodeArray.push();
    }else{
      let newNode = new Node(ctx, parseFloat(nodeComponents[0], 10), parseFloat(nodeComponents[1], 10));
      newNode.speedToNextNode = nodeComponents[2];
      nodeArray.push(newNode);
    }
  }
  return nodeArray;
}
