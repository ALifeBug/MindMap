document.body.onload = function init() {
    var pastselectednode=null;
    var pasttextblock=null;

    var $ = go.GraphObject.make;
    myDiagram =
        $(go.Diagram, "myDiagramDiv",
            {
                padding: 20,
                // when the user drags a node, also move/copy/delete the whole subtree starting with that node
                "commandHandler.copiesTree": true,
                "commandHandler.deletesTree": true,
                "draggingTool.dragsTree": true,
                initialContentAlignment: go.Spot.Center,  // center the whole graph
                "undoManager.isEnabled": true
            });
    // when the document is modified, add a "*" to the title and enable the "Save" button
    myDiagram.addDiagramListener("Modified", function(e) {
        var button = document.getElementById("SaveButton");
        if (button) button.disabled = !myDiagram.isModified;
        var idx = document.title.indexOf("*");
        if (myDiagram.isModified) {
            if (idx < 0) document.title += "*";
        } else {
            if (idx >= 0) document.title = document.title.substr(0, idx);
        }
    });
    // this is the root node, at the center of the circular layers


    // a node consists of some text with a line shape underneath
    myDiagram.nodeTemplate =
        $(go.Node,"Auto",

            { selectionObjectName: "TEXT" },
            new go.Binding("selectable","selectable"),
            $(go.Shape,
                {name: "SHAPE",
                    stretch: go.GraphObject.Horizontal,
                    portId: "",
                    //fromSpot: go.Spot.LeftRightSides, toSpot: go.Spot.LeftRightSides,
                    strokeWidth: 1},

                new go.Binding("figure", "figure"),
                new go.Binding("geometryString", "geometryString"),
                new go.Binding("fill", "color"),
                new go.Binding("stroke", "brush"),
                // make sure links come in from the proper direction and go out appropriately
                new go.Binding("fromSpot", "dir", function(d) { return spotConverter(d, true); }),
                new go.Binding("toSpot", "dir", function(d) { return spotConverter(d, false); })),
            // remember the locations of each node in the node data
            new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
            // make sure text "grows" in the desired direction
            new go.Binding("locationSpot", "dir", function(d) { return spotConverter(d, false); }),

            $(go.TextBlock,
                {
                    name: "TEXT",
                    minSize: new go.Size(30, 15),
                    margin: 5,
                    editable: true,
                    //onblur:Submissionofmodification
                },
                // remember not only the text string but the scale and the font in the node data
                new go.Binding("text", "text").makeTwoWay(),
                new go.Binding("scale", "scale").makeTwoWay(),
                new go.Binding("font", "font").makeTwoWay())

        );


    // selected nodes show a button for adding children
    myDiagram.nodeTemplate.selectionAdornmentTemplate =
        $(go.Adornment, "Spot",
            $(go.Panel, "Auto",
                // this Adornment has a rectangular blue Shape around the selected node
                $(go.Shape, { fill: null, stroke: "dodgerblue", strokeWidth: 3 }),
                $(go.Placeholder, { margin: new go.Margin(4, 4, 0, 4) })
            ),
            // and this Adornment has a Button to the right of the selected node
            $("Button",
                {
                    alignment: go.Spot.Right,
                    alignmentFocus: go.Spot.Left,
                    click: addNodeAndLink  // define click behavior for this Button in the Adornment
                },
                $(go.TextBlock, "+",  // the Button content
                    { font: "bold 8pt sans-serif" })
            )
        );
    // the context menu allows users to change the font size and weight,
    // and to perform a limited tree layout starting at that node
    myDiagram.nodeTemplate.contextMenu =
        $(go.Adornment, "Vertical",
            $("ContextMenuButton",
                $(go.TextBlock, "Bigger"),
                { click: function(e, obj) { changeTextSize(obj, 1.1); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "Smaller"),
                { click: function(e, obj) { changeTextSize(obj, 1/1.1); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "Bold"+ "/Normal"),
                { click: function(e, obj) { toggleTextWeight(obj); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "Layout"),
                {
                    click: function(e, obj) {
                        var adorn = obj.part;
                        adorn.diagram.startTransaction("Subtree Layout");
                        layoutTree(adorn.adornedPart);
                        adorn.diagram.commitTransaction("Subtree Layout");
                    }
                }
            ),
            /////////////

            $("ContextMenuButton",
                $(go.TextBlock, "Eclipse"),
                { click: function(e, obj) { changeToEllipse(obj); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "Rectangle"),
                { click: function(e, obj) { changeToRectangle(obj); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "Circle"),
                { click: function(e, obj) { changeToCircle(obj); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "Line"),
                { click: function(e, obj) { changeToLine(obj); } })
        );
    // a link is just a Bezier-curved line of the same color as the node to which it is connected
    myDiagram.linkTemplate =
        $(go.Link,
            {
                curve: go.Link.Normal,
                fromShortLength: -2,
                toShortLength: -2,
                selectable: false},
            new go.Binding("routing","routing"),
            {   routing: go.Link.Orthogonal,
                corner: 10},
            $(go.Shape,
                { strokeWidth: 1.5 },
                new go.Binding("stroke", "toNode", function(n) {
                    if (n.data.brush) return n.data.brush;
                    return "black";
                }).ofObject())
        );
    // the Diagram's context menu just displays commands for general functionality
    myDiagram.contextMenu =
        $(go.Adornment, "Vertical",
            $("ContextMenuButton",
                $(go.TextBlock, "Undo"),
                { click: function(e, obj) { e.diagram.commandHandler.undo(); } },
                new go.Binding("visible", "", function(o) { return o.diagram && o.diagram.commandHandler.canUndo(); }).ofObject()),
            $("ContextMenuButton",
                $(go.TextBlock, "Redo"),
                { click: function(e, obj) { e.diagram.commandHandler.redo(); } },
                new go.Binding("visible", "", function(o) { return o.diagram && o.diagram.commandHandler.canRedo(); }).ofObject()),
            $("ContextMenuButton",
                $(go.TextBlock, "Save"),
                { click: function(e, obj) { save(); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "Load"),
                { click: function(e, obj) { load(); } })
        );
    //////////
    ///*
    myDiagram.addDiagramListener("ChangedSelection", function(e) {
        var bol = false;
        myDiagram.selection.each(function(node) {
            bol=true;
            if(pastselectednode){
                if(pastselectednode.data.text!==pasttextblock)
                    Submissionofmodification(pastselectednode);
                if(pastselectednode!==node){
                    buliddata(pastselectednode,'endselection');
                }
            }
            pastselectednode = node;
            pasttextblock = node.data.text;
            buliddata(node,"selected");
        });
        if(!bol) {
            if(pastselectednode.data.text!==pasttextblock)
                Submissionofmodification(pastselectednode);
                buliddata(pastselectednode, "endselection");
                pastselectednode=null;
        }
    });
    //*//////////////
    myDiagram.addDiagramListener("SelectionDeleting", function(e) {
        myDiagram.selection.each(function(node) {
            var parent = JSON.stringify(node.data.parent);
            var key = JSON.stringify(node.data.key);
            //alert("Delete key:"+key+",parent:"+parent);
            buliddata(node,"deletenode");
        });
    });
    myDiagram.addDiagramListener("SelectionMoved", function(e) {
        var rootX = myDiagram.findNodeForKey(0).location.x;
        //var rootY = myDiagram.findNodeForKey(0).location.y;
        myDiagram.selection.each(function(node) {
            if (node.data.parent !== 0) return; // Only consider nodes connected to the root
            var nodeX = node.location.x;
            //var nodeY = node.location.y;
            //if(nodeY < (rootY + 20)){
            if (rootX < nodeX && node.data.dir !== "right") {
                updateNodeDirection(node, "right");
                //alert("Move to right key:"+JSON.stringify(node.data.key)+",parent:"+JSON.stringify(node.data.parent));
                buliddata(node,"movetoright");
            } else if (rootX > nodeX && node.data.dir !== "left") {
                updateNodeDirection(node, "left");
                //alert("Move to left key:"+JSON.stringify(node.data.key)+",parent:"+JSON.stringify(node.data.parent));
                buliddata(node,"movetoleft");
            }
            //}else{ updateNodeDirection(node, "bottom");}

            layoutTree(node);
        });
    });
    // read in the predefined graph using the JSON format data held in the "mySavedModel" textarea
    load();
}
function spotConverter(dir, from) {
    if (dir === "left") {
        return (from ? go.Spot.MiddleLeft : go.Spot.MiddleRight);
    } else if(dir === "right"){
        return (from ? go.Spot.MiddleRight : go.Spot.MiddleLeft);
    }else if(dir === "bottom"){
        return (from ? go.Spot.MiddleBottom : go.Spot.MiddleTop);
    }
    /*else if(dir === "leftright"){
        return (go.Spot.LeftRightSides);
    }*/
}
////////
function removenode(node,direction){
    if (node.data.parent === 0) { // Only consider nodes connected to the root
        if (direction === "right" && node.data.dir !== "right") {
            updateNodeDirection(node, "right");
        } else if (direction === "left"  && node.data.dir !== "left") {
            updateNodeDirection(node, "left");
        }
    }
}
//////////
function changeTextSize(obj, factor) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Text Size");
    var node = adorn.adornedPart;
    var tb = node.findObject("TEXT");
    tb.scale *= factor;
    adorn.diagram.commitTransaction("Change Text Size");
}
function toggleTextWeight(obj) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Text Weight");
    var node = adorn.adornedPart;
    var tb = node.findObject("TEXT");
    // assume "bold" is at the start of the font specifier
    var idx = tb.font.indexOf("bold");
    if (idx < 0) {
        tb.font = "bold " + tb.font;
    } else {
        tb.font = tb.font.substr(idx + 5);
    }
    adorn.diagram.commitTransaction("Change Text Weight");
}
////////
function changeToEllipse(obj) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Shape");
    var node = adorn.adornedPart;
    var data = node.data;
    //alert(data.figure);
    if(data.figure)
        data.figure = "Ellipse";
    else {
        delete data.geometryString;
        data.figure = "Ellipse";
    }
    layoutTree(node);
    save();
    adorn.diagram.commitTransaction("Change Shape");
    load();
}
function changeToRectangle(obj) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Shape");
    var node = adorn.adornedPart;
    var data = node.data;
    //alert(data.figure);
    if(data.figure)
        data.figure = "Rectangle";
    else {
        delete data.geometryString;
        data.figure = "Rectangle";
    }
    layoutTree(node);
    save();
    adorn.diagram.commitTransaction("Change Shape");
    load();
}
function changeToCircle(obj) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Shape");
    var node = adorn.adornedPart;
    var data = node.data;
    //alert(data.figure);
    if(data.figure)
        data.figure = "Circle";
    else {
        delete data.geometryString;
        data.figure = "Circle";
    }
    layoutTree(node);
    save();
    adorn.diagram.commitTransaction("Change Shape");
    load();
}
function changeToLine(obj) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Shape");
    var node = adorn.adornedPart;
    var data = node.data;
    //alert(data.figure);
    if(data.figure){
        delete data.figure;
        data.geometryString = "M 0 20 L 20 20";
        //data.figure = "LineH";
    }
    layoutTree(node);
    save();
    adorn.diagram.commitTransaction("Change Shape");
    load();
}
function updateNodeDirection(node, dir) {
    myDiagram.model.setDataProperty(node.data, "dir", dir);
    // recursively update the direction of the child nodes
    var chl = node.findTreeChildrenNodes(); // gives us an iterator of the child nodes related to this particular node
    /*if(dir === "leftright"){
        while(chl.next()) {
            updateNodeDirection(chl.value, "right");
        }
    }else{*/
    while(chl.next()) {
        updateNodeDirection(chl.value, dir);
    }
    //}
}
function addNodeAndLink(e, obj) {
    var adorn = obj.part;
    var diagram = adorn.diagram;
    diagram.startTransaction("Add Node");
    var oldnode = adorn.adornedPart;
    var olddata = oldnode.data;
    // copy the brush and direction to the new node data
    if(olddata.key === 0 ){
        if(olddata.dir === "left")
            var newdata = { text: "idea", figure:"Rectangle",brush: olddata.brush, dir:"left",color: olddata.color , parent: olddata.key };
        else if(olddata.dir === "right")
            var newdata = { text: "idea", figure:"Rectangle",brush: olddata.brush, dir:"right",color: olddata.color , parent: olddata.key };
        else if(olddata.dir === "bottom")
            var newdata = { text: "idea", figure:"Rectangle",brush: olddata.brush, dir:"bottom",color: olddata.color , parent: olddata.key };
        else
            var newdata = { text: "idea", figure:"Rectangle",brush: olddata.brush, dir:"right",color: olddata.color , parent: olddata.key };
    }
    else var newdata = { text: "idea", geometryString:"M 0 20 L 20 20",brush: olddata.brush, dir: olddata.dir,color: olddata.color , parent: olddata.key };
    //else var newdata = { text: "idea", figure:"LineH",brush: olddata.brush, dir: olddata.dir,color: olddata.color , parent: olddata.key };
    diagram.model.addNodeData(newdata);
    //alert("Add node key:"+JSON.stringify(olddata.key)+",direction:"+JSON.stringify(olddata.dir));
    buliddata(oldnode,"addnode");
    layoutTree(oldnode);
    diagram.commitTransaction("Add Node");
    // if the new node is off-screen, scroll the diagram to show the new node
    var newnode = diagram.findNodeForData(newdata);
    if (newnode !== null) diagram.scrollToRect(newnode.actualBounds);

}
function layoutTree(node) {
    layoutAll();
}

function layoutAngle(parts, angle) {
    var layout = go.GraphObject.make(go.TreeLayout,
        { angle: angle,
            arrangement: go.TreeLayout.ArrangementFixedRoots,
            nodeSpacing: 5,
            layerSpacing: 20,
            setsPortSpot: false, // don't set port spots since we're managing them with our spotConverter function
            setsChildPortSpot: false });
    layout.doLayout(parts);
}
function layoutAll() {
    var root = myDiagram.findNodeForKey(0);
    if (root === null) return;
    myDiagram.startTransaction("Layout");
    // split the nodes and links into two collections
    var rightward = new go.Set(go.Part);
    var leftward = new go.Set(go.Part);
    var downward = new go.Set(go.Part);
    root.findLinksConnected().each(function(link) {
        var child = link.toNode;
        if (child.data.dir === "left"  ) {
            leftward.add(root);  // the root node is in both collections
            leftward.add(link);
            leftward.addAll(child.findTreeParts());
        } else if(child.data.dir === "right"){
            rightward.add(root);  // the root node is in both collections
            rightward.add(link);
            rightward.addAll(child.findTreeParts());
        } else if(child.data.dir === "bottom"){
            downward.add(root);  // the root node is in both collections
            downward.add(link);
            downward.addAll(child.findTreeParts());
        }
    });
    // do one layout and then the other without moving the shared root node
    layoutAngle(rightward, 0);
    layoutAngle(leftward, 180);
    layoutAngle(downward, 90);
    myDiagram.commitTransaction("Layout");
    //alert("Layout tree!");
    buliddata(null,"layouttree");
}
function relayoutAll(){
    var root = myDiagram.findNodeForKey(0);
    if (root === null) return;
    myDiagram.startTransaction("Layout");
    // split the nodes and links into two collections
    var rightward = new go.Set(go.Part);
    var leftward = new go.Set(go.Part);
    var downward = new go.Set(go.Part);
    root.findLinksConnected().each(function(link) {
        var child = link.toNode;
        if (child.data.dir === "left"  ) {
            leftward.add(root);  // the root node is in both collections
            leftward.add(link);
            leftward.addAll(child.findTreeParts());
        } else if(child.data.dir === "right"){
            rightward.add(root);  // the root node is in both collections
            rightward.add(link);
            rightward.addAll(child.findTreeParts());
        } else if(child.data.dir === "bottom"){
            downward.add(root);  // the root node is in both collections
            downward.add(link);
            downward.addAll(child.findTreeParts());
        }
    });
    // do one layout and then the other without moving the shared root node
    layoutAngle(rightward, 0);
    layoutAngle(leftward, 180);
    layoutAngle(downward, 90);
    myDiagram.commitTransaction("Layout");
}

function changeLayoutLeft(){
    var root = myDiagram.findNodeForKey(0);
    updateNodeDirection(root, "left");
    buliddata(null,"layoutleft");
    layoutAll();
    //alert("Layout left!");

}
function changeLayoutRight(){
    var root = myDiagram.findNodeForKey(0);
    updateNodeDirection(root, "right");
    buliddata(null,"layoutright");
    layoutAll();
    //alert("Layout right!");

}
function changeLayoutBottom(){
    var root = myDiagram.findNodeForKey(0);
    updateNodeDirection(root, "bottom");
    buliddata(null,"layoutbottom");
    layoutAll();
    //alert("Layout bottom!");

}
function changeLayoutLeftright(){
    var root = myDiagram.findNodeForKey(0);
    delete root.data.dir;
    save();
    load();
    buliddata(null,"layoutleftright");
    layoutAll();

}
function Submissionofmodification(node){
        var text = JSON.stringify(node.data.text);
        buliddata(node,"changetext");
        save();
}

//var timestamp=new Date().getTime();
function deletechildtree(node){
    var chl = node.findTreeChildrenNodes();
    myDiagram.remove(node);
    while(chl.next()) {
        deletechildtree(chl.value);
    }
    //myDiagram.model.removeParts(node.findTreeParts);
    //myDiagram.model.removeNodeData(node.data);
}

function buliddata(node,operation){
    var data = {};
    //data.usrname = "uling";
    data.op = operation;
    if(node){
        data.key = node.data.key;
        if(data.key !== 0)data.parent = node.data.parent;
        else {
            data.parent = 0;
            delete data.parent;
        }
        if(operation === "changetext") data.text = node.data.text;
        else{
            data.text = node.data.text;
            delete data.text;
        }
    }else{
        data.key = 0;
        data.parent = 0;
        delete data.key;
        delete data.parent;
    }
    socket.emit('message',{'roomid':id,'syncmsg':JSON.stringify(data)});
}
function handledata(data){
    var obj = JSON.parse(data);
    if(obj.op === "changetext"){
        var node = myDiagram.findNodeForKey(obj.key);
        myDiagram.model.setDataProperty(node.data, "text", obj.text);
        //node.text = obj.text;
    }else if(obj.op === "selected"){
        var node = myDiagram.findNodeForKey(obj.key);
        myDiagram.model.setDataProperty(node.data, "selectable", false);
    }else if(obj.op === "endselection"){
        var node = myDiagram.findNodeForKey(obj.key);
        myDiagram.model.setDataProperty(node.data, "selectable", true);
    }else if(obj.op === "addnode"){
        var node = myDiagram.findNodeForKey(obj.key);
        if(node.data.key === 0 ){
            if(node.data.dir === "left")
                var newdata = { text: "idea", figure:"Rectangle",brush: node.data.brush, dir:"left",color: node.data.color , parent: node.data.key };
            else if(node.data.dir === "right")
                var newdata = { text: "idea", figure:"Rectangle",brush: node.data.brush, dir:"right",color: node.data.color , parent: node.data.key };
            else if(node.data.dir === "bottom")
                var newdata = { text: "idea", figure:"Rectangle",brush: node.data.brush, dir:"bottom",color: node.data.color , parent: node.data.key };
            else
                var newdata = { text: "idea", figure:"Rectangle",brush: node.data.brush, dir:"right",color: node.data.color , parent: node.data.key };
        }
        else var newdata = { text: "idea", geometryString:"M 0 20 L 20 20",brush: node.data.brush, dir: node.data.dir,color: node.data.color , parent: node.data.key };
        myDiagram.model.addNodeData(newdata);
    }else if(obj.op === "layouttree"){
        relayoutAll();
    }else if(obj.op === "movetoleft"){
        var node = myDiagram.findNodeForKey(obj.key);
        removenode(node,"left");
    }else if(obj.op === "movetoright"){
        var node = myDiagram.findNodeForKey(obj.key);
        removenode(node,"right");
    }else if(obj.op === "layoutleft"){
        var root = myDiagram.findNodeForKey(0);
        updateNodeDirection(root, "left");
    }else if(obj.op === "layoutright"){
        var root = myDiagram.findNodeForKey(0);
        updateNodeDirection(root, "right");
    }else if(obj.op === "layoutbottom"){
        var root = myDiagram.findNodeForKey(0);
        updateNodeDirection(root, "bottom");
    }else if(obj.op === "layoutleftright"){
        var root = myDiagram.findNodeForKey(0);
        delete root.data.dir;
        save();
        load();
    }else if(obj.op === "deletenode"){
        var node = myDiagram.findNodeForKey(obj.key);
        deletechildtree(node);
    }
}



function download() {
    html2canvas(document.getElementById("myDiagramDiv"), {
        background: '#ffffff',
        allowTaint: true,
        useCORS: true,
        height: $("#myDiagramDiv").outerHeight(),
        onrendered: function (canvas) {
            var contentWidth = canvas.width;
            var contentHeight = canvas.height;
            //一页pdf显示html页面生成的canvas高度;
            var pageHeight = contentWidth / 595.28 * 841.89;
            //未生成pdf的html页面高度
            var leftHeight = contentHeight;
            //pdf页面偏移
            var position = 0;
            //a4纸的尺寸[595.28,841.89]，html页面生成的canvas在pdf中图片的宽高
            var imgWidth = 555.28;
            var imgHeight = 555.28 / contentWidth * contentHeight;

            var pageData = canvas.toDataURL('image/jpeg', 1.0);

            var pdf = new jsPDF('', 'pt', 'a4');
            //有两个高度需要区分，一个是html页面的实际高度，和生成pdf的页面高度(841.89)
            //当内容未超过pdf一页显示的范围，无需分页
            if (leftHeight < pageHeight) {
                pdf.addImage(pageData, 'JPEG', 20, 0, imgWidth, imgHeight);
            } else {
                while (leftHeight > 0) {
                    pdf.addImage(pageData, 'JPEG', 20, position, imgWidth, imgHeight)
                    leftHeight -= pageHeight;
                    position -= 841.89;
            //避免添加空白页
                    if (leftHeight > 0) {
                        pdf.addPage();
                    }
                }
            }
            pdf.save('pdf_' + new Date().getTime() + '.pdf');
        }
    })
}

/**********************************************************************************************************************/
const socket = io('http://47.95.194.211:3006');
var addr = window.location.href;
var arr = addr.split('=');
var id = arr[arr.length-1];
function save() {
    var addr = window.location.href;
    var arr = addr.split('=');
    var id = arr[arr.length-1];
    var data = JSON.parse(myDiagram.model.toJson()).nodeDataArray;
    $.ajax({
        type:'post',
        url:'/mind/save',
        data:{
            id:id,
            newData:JSON.stringify(data)
        },
        success:function (data) {
            if(data){
                if(data.status==='success') {
                    myDiagram.isModified = false;
                }
            }
        }
    })
}
function load() {
    $.ajax({
        type:"post",
        url:'/mind/load',
        data:{
            id:id
        },
        success:function (data) {
            if(data) {
                var data ='{"class":"go.TreeModel","nodeDataArray":'+data.mymind+'}';
                myDiagram.model = go.Model.fromJson(data);
            }
        }
    });
}
function invite() {
    if($('#name').val()===''){
        $('#name').css('borderColor','#f41717');
        return;
    }else{
        $.ajax({
            type:'post',
            url:'/username',
            data:{},
            success:function (data) {
                if(data){
                    socket.emit('invite',{'to':$('#name').val(),
                                          'from':data.name,
                                          'url':'http://47.95.194.211:3006/mind/load?id='+id
                    });
                    window.location.reload();
                }
            }
        })
    }
}
$(function () {
    $('#SaveButton').bind('click',function () {

    });

    $.ajax({
        type:'post',
        url:'/username',
        data:{},
        success:function (data) {
            if(data){
                var user = data.name;
                socket.on('inOrnot',function (data) {
                    if(data.in){
                        $('#LeaveButton').css('visibility','visible');
                        $('#LeaveButton').bind('click',function () {
                            socket.emit('leave',{id:id,user:user});
                            window.location.reload();
                        });
                        socket.on('new message',function (data) {
                            handledata(data);
                        });
                    }
                });
                socket.emit('rejoin',{'name':data.name,'roomid':id,'socketid':socket.id});
            }
        }
    })
});
