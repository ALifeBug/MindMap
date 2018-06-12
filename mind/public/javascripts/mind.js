var pastselectednode=null;
var adr =[];
document.body.onload = function init() {
    var pasttextblock=null;
    var $ = go.GraphObject.make;
    myDiagram =
        $(go.Diagram, "myDiagramDiv",
            {
                padding: 20,
                "commandHandler.copiesTree": true,
                "commandHandler.deletesTree": true,
                "draggingTool.dragsTree": true,
                initialContentAlignment: go.Spot.Center,
                "undoManager.isEnabled": true
            });
    myDiagram.addDiagramListener("Modified", function() {
        var button = document.getElementById("SaveButton");
        if (button) button.disabled = !myDiagram.isModified;
        var idx = document.title.indexOf("*");
        if (myDiagram.isModified) {
            if (idx < 0) document.title += "*";
        } else {
            if (idx >= 0) document.title = document.title.substr(0, idx);
        }
    });


    myDiagram.nodeTemplate =
        $(go.Node,"Auto",

            { selectionObjectName: "TEXT" },
            new go.Binding("selectable","selectable"),
            $(go.Shape,
                {name: "SHAPE",
                    stretch: go.GraphObject.Horizontal,
                    portId: "",
                    strokeWidth: 2,
                    stroke:'#ffc107'
                },

                new go.Binding("figure", "figure"),
                new go.Binding("geometryString", "geometryString"),
                new go.Binding("fill", "color"),
                new go.Binding("stroke", "brush"),
                new go.Binding("fromSpot", "dir", function(d) { return spotConverter(d, true); }),
                new go.Binding("toSpot", "dir", function(d) { return spotConverter(d, false); })),
            new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
            new go.Binding("locationSpot", "dir", function(d) { return spotConverter(d, false); }),

            $(go.TextBlock,
                {
                    name: "TEXT",
                    minSize: new go.Size(30, 15),
                    margin: 5,
                    editable: true,
                    font:'11pt Microsoft Yahei',
                    stroke:'#343a40'
                },
                new go.Binding("text", "text").makeTwoWay(),
                new go.Binding("scale", "scale").makeTwoWay(),
                new go.Binding("font", "font").makeTwoWay())

        );

    myDiagram.nodeTemplate.selectionAdornmentTemplate =
        $(go.Adornment, "Spot",
            $(go.Panel, "Auto",
                $(go.Shape, { fill: null, stroke: "dodgerblue", strokeWidth: 3 }),
                $(go.Placeholder, { margin: new go.Margin(4, 4, 0, 4) })
            ),
            $("Button",
                {
                    alignment: go.Spot.Right,
                    alignmentFocus: go.Spot.Left,
                    click: addNodeAndLink
                },
                $(go.TextBlock, "+",
                    { font: "bold 8pt sans-serif" })
            )
        );
    myDiagram.nodeTemplate.contextMenu =
        $(go.Adornment, "Vertical",
            $("ContextMenuButton",
                $(go.TextBlock, "向前一级"),
                { click: function(e, obj) { changeLevel(obj); } },
                new go.Binding("visible", "",
                    function(obj) {
                        if(obj.part.adornedPart.data.key === 0 || obj.part.adornedPart.data.parent === 0)
                            return false;else return true; }).ofObject()),
            $("ContextMenuButton",
                $(go.TextBlock, "改变父节点"),
                { click: function(e, obj) {  changeParent(obj);} },
                new go.Binding("visible", "", function(obj) { if(obj.part.adornedPart.data.key === 0)return false;else return true ;}).ofObject()),
            $("ContextMenuButton",
                $(go.TextBlock, "字体放大"),
                { click: function(e, obj) { changeTextSize(obj, 1.1); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "字体缩小"),
                { click: function(e, obj) { changeTextSize(obj, 1/1.1); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "加粗"+ "/正常"),
                { click: function(e, obj) { toggleTextWeight(obj); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "重新布局"),
                {
                    click: function(e, obj) {
                        var adorn = obj.part;
                        adorn.diagram.startTransaction("Subtree Layout");
                        layoutTree(adorn.adornedPart);
                        adorn.diagram.commitTransaction("Subtree Layout");
                    }
                }
            ),

            $("ContextMenuButton",
                $(go.TextBlock, "椭圆"),
                { click: function(e, obj) { changeToEllipse(obj); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "圆角矩形"),
                { click: function(e, obj) { changeToRectangle(obj); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "圆形"),
                { click: function(e, obj) { changeToCircle(obj); } }),
            $("ContextMenuButton",
                $(go.TextBlock, "线形"),
                { click: function(e, obj) { changeToLine(obj); } })
        );
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
                { strokeWidth: 2 },
                new go.Binding("stroke", "toNode", function(n) {
                    if (n.data.brush) return n.data.brush;
                    return "#fd7e14";
                }).ofObject())
        );
    myDiagram.contextMenu =
        $(go.Adornment, "Vertical",
            $("ContextMenuButton",
                $(go.TextBlock, "撤销"),
                { click: function(e, obj) { e.diagram.commandHandler.undo(); } },
                new go.Binding("visible", "", function(o) { return o.diagram && o.diagram.commandHandler.canUndo(); }).ofObject()),
            $("ContextMenuButton",
                $(go.TextBlock, "重做"),
                { click: function(e, obj) { e.diagram.commandHandler.redo(); } },
                new go.Binding("visible", "", function(o) { return o.diagram && o.diagram.commandHandler.canRedo(); }).ofObject()),
        );

    myDiagram.addDiagramListener("ChangedSelection", function(e) {
        var bol = false;
        myDiagram.selection.each(function(node) {
            bol=true;
            if(pastselectednode){
                if(pastselectednode.data.text!==pasttextblock) {
                    Submissionofmodification(pastselectednode);
                    layoutAll();
                }
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
    myDiagram.addDiagramListener("SelectionDeleting", function(e) {
        myDiagram.selection.each(function(node) {
            var parent = JSON.stringify(node.data.parent);
            var key = JSON.stringify(node.data.key);
            buliddata(node,"deletenode");
        });
    });
    myDiagram.addDiagramListener("SelectionMoved", function(e) {
        var rootX = myDiagram.findNodeForKey(0).location.x;
        var root = myDiagram.findNodeForKey(0).data;
        myDiagram.selection.each(function(node) {
            if (node.data.parent !== 0 || root.dir==='left' || root.dir==='right' || root.dir==='bottom') return;
            var nodeX = node.location.x;
            if (rootX < nodeX && node.data.dir !== "right") {
                updateNodeDirection(node, "right");
                buliddata(node,"movetoright");
            } else if (rootX > nodeX && node.data.dir !== "left") {
                updateNodeDirection(node, "left");
                buliddata(node,"movetoleft");
            }
            layoutTree(node);
        });
    });
    //load();
};

function spotConverter(dir, from) {
    if (dir === "left") {
        return (from ? go.Spot.MiddleLeft : go.Spot.MiddleRight);
    } else if(dir === "right"){
        return (from ? go.Spot.MiddleRight : go.Spot.MiddleLeft);
    }else if(dir === "bottom"){
        return (from ? go.Spot.MiddleBottom : go.Spot.MiddleTop);
    }
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
function changeLevel(obj){
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Node Level");
    var node = adorn.adornedPart;
    var father = myDiagram.findNodeForKey(node.data.parent);
    myDiagram.model.setDataProperty(node.data, "parent", father.data.parent);
    myDiagram.model.setDataProperty(node.data, "figure", father.data.figure);
    myDiagram.isModified = true;
    buliddata(node,"changeLevelfront");
    adorn.diagram.commitTransaction("Change Node Level");
    layoutAll();
}
function rechangeLevel(node){
    var father = myDiagram.findNodeForKey(node.data.parent);
    myDiagram.model.setDataProperty(node.data, "parent", father.data.parent);
    myDiagram.model.setDataProperty(node.data, "figure", father.data.figure);
    myDiagram.isModified = true;
}
function listkey(node){
    var chl = node.findTreeChildrenNodes();
    while (chl.next()) {
        var add = getAdornment();
        add.adornedObject = chl.value;
        chl.value.addAdornment("TextBlockOver", add);
        adr.push(chl.value.data.key);
        listkey(chl.value);
    }
}
function removeAllAdornment(){
    var len = adr.length;
    for(var x =0;x<len;x++){
        var node = myDiagram.findNodeForKey(adr[0]);
        adr.splice(0,1);
        node.removeAdornment("TextBlockOver");
    }
}


function Formvisible(){
    $('#chpaform').fadeIn();
}
function FormHidden() {
    removeAllAdornment();
    $('#chpaform').fadeOut();
}


function changeParent(obj){
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Parent");
    var node = adorn.adornedPart;
    var rootNode = myDiagram.findNodeForKey(0);
    var add = getAdornment();
    add.adornedObject = rootNode;
    rootNode.addAdornment("TextBlockOver", add);
    adr.push(0);
    listkey(rootNode);
    Formvisible();

    var pNode = null;
    document.getElementById('ok').onclick = function () {

        var pKey = $('#parentnum').val();
        if (pKey === "") {
            $('#parentnum').css('borderColor', '#dc3545');
        }
        else {
            pKey = 0 - pKey;
            pNode = myDiagram.findNodeForKey(pKey);
            if (pNode !== null && pNode.data.key !== node.data.key) {
                removeAllAdornment();
                FormHidden();
                var treePartIta = node.findTreeParts().iterator;    //获取选中节点所在子树的所有节点和连线迭代器
                var Ita = node.findTreeParts().iterator;
                var isChildKey = false;                     //判断指定父节点是否为其子节点
                while (Ita.next()) {
                    if (Ita.value.data.key == pKey) {
                        isChildKey = true;
                        break;
                    }
                }
                if (isChildKey) {     //指定父节点为其子节点，则所有直接子节点向前一级，源节点再插入指定位置，参数中无需改变方向
                    var childNodes = node.findTreeChildrenNodes();
                    while (childNodes.next()) {
                        myDiagram.model.setDataProperty(childNodes.value.data, "parent", node.data.parent);//直接子节点改变父节点号
                        if (node.data.parent == 0) {              //根据前一级是否为根节点改变形状或几何参数值
                            delete childNodes.value.data.geometryString;
                            myDiagram.model.setDataProperty(childNodes.value.data, "figure", "RoundedRectangle");
                        }
                        else {
                            delete childNodes.value.data.figure;
                            myDiagram.model.setDataProperty(childNodes.value.data, "geometryString", "M 0 20 L 20 20");
                        }
                    }
                    myDiagram.model.setDataProperty(node.data, "parent", pKey);     //改变选中节点的父节点号和形状
                    delete node.data.figure;
                    myDiagram.model.setDataProperty(node.data, "geometryString", "M 0 20 L 20 20");
                }
                else {               //指定父节点不为其子节点，则将其所在整棵子树移到指定位置
                    myDiagram.model.setDataProperty(node.data, "parent", pKey);//改变选中节点的父节点号
                    if (pNode.data.key == 0) {                  //根据指定父节点是否为根节点改变选中节点形状或几何参数值
                        // if(node.data.geometryString)
                        delete node.data.geometryString;
                        // alert();
                        myDiagram.model.setDataProperty(node.data, "figure", "RoundedRectangle");
                    }
                    else {
                        delete node.data.figure;
                        myDiagram.model.setDataProperty(node.data, "geometryString", "M 0 20 L 20 20");
                    }
                    var root = myDiagram.findNodeForKey(0);
                    while (treePartIta.next()) {              //正常情况treePartIta应从首个元素开始迭代
                        //改变选中节点所在子树中所有节点的方向,若指定父节点为根节点则默认方向为右(根节点无方向)
                        if (root.data.dir == "bottom")
                            myDiagram.model.setDataProperty(treePartIta.value.data, "dir", (pKey == 0) ? "bottom" : pNode.data.dir);
                        else if (root.data.dir == "left") {
                            myDiagram.model.setDataProperty(treePartIta.value.data, "dir", (pKey == 0) ? "left" : pNode.data.dir);
                        }
                        else
                            myDiagram.model.setDataProperty(treePartIta.value.data, "dir", (pKey == 0) ? "right" : pNode.data.dir);
                    }

                }
                myDiagram.isModified = true;
                buliddata(node, "changeparent", pKey);
                layoutAll();
            }
        }
    };
    adorn.diagram.commitTransaction("Change Parent");
}

function rechangeParent(node,pKey){
    var pNode = myDiagram.findNodeForKey(pKey);
    if(pNode.isInTreeOf(node)){//指定父节点为其子节点，则所有直接子节点向前一级，源节点再插入指定位置，参数中无需改变方向
        var childNodes = node.findTreeChildrenNodes();
        while (childNodes.next()) {
            myDiagram.model.setDataProperty(childNodes.value.data, "parent", node.data.parent);//直接子节点改变父节点号
            if (node.data.parent == 0) {              //根据前一级是否为根节点改变形状或几何参数值
                delete childNodes.value.data.geometryString;
                myDiagram.model.setDataProperty(childNodes.value.data, "figure", "RoundedRectangle");
            }
            else {
                delete childNodes.value.data.figure;
                myDiagram.model.setDataProperty(childNodes.value.data, "geometryString", "M 0 20 L 20 20");
            }
        }
        myDiagram.model.setDataProperty(node.data, "parent", pKey);     //改变选中节点的父节点号和形状
        delete node.data.figure;
        myDiagram.model.setDataProperty(node.data, "geometryString", "M 0 20 L 20 20");
    }
    else{//指定父节点不为其子节点，则将其所在整棵子树移到指定位置
        myDiagram.model.setDataProperty(node.data, "parent", pKey);//改变选中节点的父节点号
        if (pNode.data.key == 0) {                  //根据指定父节点是否为根节点改变选中节点形状或几何参数值
            delete node.data.geometryString;
            myDiagram.model.setDataProperty(node.data, "figure", "RoundedRectangle");
        }
        else {
            delete node.data.figure;
            myDiagram.model.setDataProperty(node.data, "geometryString", "M 0 20 L 20 20");
        }
//                        alert(Ita.key+","+treePartIta.key);     //若出错极大可能与Ita有关！！！
        var root = myDiagram.findNodeForKey(0);
        while(treePartIta.next()){              //正常情况treePartIta应从首个元素开始迭代
            //改变选中节点所在子树中所有节点的方向,若指定父节点为根节点则默认方向为右(根节点无方向)
            if(root.data.dir == "bottom")
                myDiagram.model.setDataProperty(treePartIta.value.data, "dir", (pKey==0)?"bottom":pNode.data.dir);
            else if(root.data.dir == "left"){
                myDiagram.model.setDataProperty(treePartIta.value.data, "dir", (pKey==0)?"left":pNode.data.dir);
            }
            else
                myDiagram.model.setDataProperty(treePartIta.value.data, "dir", (pKey==0)?"right":pNode.data.dir);
        }
    }
    myDiagram.isModified = true;
}


/*function rechangeParent(node,pKey){
    myDiagram.model.setDataProperty(node.data, "parent", pKey);
    if(pKey==0){z
        if(node.data.geometryString)
            delete node.data.geometryString;
        myDiagram.model.setDataProperty(node.data,"figure","RoundedRectangle");
    }
    else{
        if(node.data.figure)
            delete node.data.figure;
        myDiagram.model.setDataProperty(node.data,"geometryString","M 0 20 L 20 20");
    }
    var treePartIta = node.findTreeParts().iterator;
    var pNode = myDiagram.findNodeForKey(pKey);
    while(treePartIta.next()){
        myDiagram.model.setDataProperty(treePartIta.value.data, "dir", (pKey==0)?"right":pNode.data.dir);
    }
    myDiagram.isModified = true;
    //layoutAll();
}*/


function changeTextSize(obj, factor) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Text Size");
    var node = adorn.adornedPart;
    var tb = node.findObject("TEXT");
    tb.scale *= factor;
    if(factor > 1)
        buliddata(node,"bigger");
    else buliddata(node,"smaller");
    adorn.diagram.commitTransaction("Change Text Size");
}
function rechangeTextSize(node, factor) {
    var tb = node.findObject("TEXT");
    tb.scale *= factor;
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
        buliddata(node,"bold");
    } else {
        tb.font = tb.font.substr(idx + 5);buliddata(node,"normal");
    }
    adorn.diagram.commitTransaction("Change Text Weight");
}
function retoggleTextWeight(node,idx) {
    var tb = node.findObject("TEXT");
    if (idx < 0) tb.font = "bold " + tb.font;
    else{
        var a = tb.font.split(" ");
        if(a[0]==="bold"){
            a.splice(0,1);
        }
        tb.font=a.join(" ");
    }
}
////////
function changeToEllipse(obj) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Shape");
    var node = adorn.adornedPart;
    if(node.data.figure) myDiagram.model.setDataProperty(node.data, "figure", "Ellipse");
    else {delete node.data.geometryString;
        myDiagram.model.setDataProperty(node.data, "figure", "Ellipse");}
    buliddata(node,"changetoEllipse");
    adorn.diagram.commitTransaction("Change Shape");
}
function changeToRectangle(obj) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Shape");
    var node = adorn.adornedPart;
    if(node.data.figure) myDiagram.model.setDataProperty(node.data, "figure", "RoundedRectangle");
    else {delete node.data.geometryString;
        myDiagram.model.setDataProperty(node.data, "figure", "RoundedRectangle");}
    buliddata(node,"changetoRoundedRectangle");
    adorn.diagram.commitTransaction("Change Shape");
}
function changeToCircle(obj) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Shape");
    var node = adorn.adornedPart;
    if(node.data.figure) myDiagram.model.setDataProperty(node.data, "figure", "Circle");
    else {delete node.data.geometryString;
        myDiagram.model.setDataProperty(node.data, "figure", "Circle");}
    buliddata(node,"changetoCircle");
    adorn.diagram.commitTransaction("Change Shape");
}
function changeToLine(obj) {
    var adorn = obj.part;
    adorn.diagram.startTransaction("Change Shape");
    var node = adorn.adornedPart;
    if(node.data.figure){
        delete node.data.figure;
        myDiagram.model.setDataProperty(node.data, "geometryString", "M 0 20 L 20 20");buliddata(node,"changetoLine");
    }
    save();
    load();
    adorn.diagram.commitTransaction("Change Shape");
}

function rechangeShape(node,shape) {
    switch(shape){
        case "Ellipse":{
            if(node.data.figure) myDiagram.model.setDataProperty(node.data, "figure", "Ellipse");
            else {delete node.data.geometryString;
                myDiagram.model.setDataProperty(node.data, "figure", "Ellipse");}
        }break;
        case "RoundedRectangle":{
            if(node.data.figure) myDiagram.model.setDataProperty(node.data, "figure", "RoundedRectangle");
            else {delete node.data.geometryString;
                myDiagram.model.setDataProperty(node.data, "figure", "Rectangle");}
        }break;
        case "Circle":{
            if(node.data.figure) myDiagram.model.setDataProperty(node.data, "figure", "Circle");
            else {delete node.data.geometryString;
                myDiagram.model.setDataProperty(node.data, "figure", "Circle");}
        }break;
        case "Line":{
            if(node.data.figure){
                delete node.data.figure;
                myDiagram.model.setDataProperty(node.data, "geometryString", "M 0 20 L 20 20");
            }
            save();
            load();
        }break;
    }
}
function updateNodeDirection(node, dir) {
    myDiagram.model.setDataProperty(node.data, "dir", dir);
    var chl = node.findTreeChildrenNodes();
    while(chl.next()) {
        updateNodeDirection(chl.value, dir);
    }
}
function addNodeAndLink(e, obj) {
    var adorn = obj.part;
    var diagram = adorn.diagram;
    diagram.startTransaction("Add Node");
    var oldnode = adorn.adornedPart;
    var olddata = oldnode.data;
    if(olddata.key === 0 ){
        if(olddata.dir === "left")
            var newdata = { text: "分支主题", figure:"RoundedRectangle",brush: olddata.brush, dir:"left",color: olddata.color , parent: olddata.key };
        else if(olddata.dir === "right")
            var newdata = { text: "分支主题", figure:"RoundedRectangle",brush: olddata.brush, dir:"right",color: olddata.color , parent: olddata.key };
        else if(olddata.dir === "bottom")
            var newdata = { text: "分支主题", figure:"RoundedRectangle",brush: olddata.brush, dir:"bottom",color: olddata.color , parent: olddata.key };
        else
            var newdata = { text: "分支主题", figure:"RoundedRectangle",brush: olddata.brush, dir:"right",color: olddata.color , parent: olddata.key };
    }
    else var newdata = { text: "子主题", geometryString:"M 0 20 L 20 20",brush: olddata.brush, dir: olddata.dir,color: olddata.color , parent: olddata.key };
    diagram.model.addNodeData(newdata);
    buliddata(oldnode,"addnode");
    layoutTree(oldnode);
    diagram.commitTransaction("Add Node");
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
    //e

}
function changeLayoutLeftright(){
    var root = myDiagram.findNodeForKey(0);
    updateNodeDirection(root, "LeftRightSides");
    var chl = root.findTreeChildrenNodes();
    var ch2 = chl;
    var len = chl.count;
    for(var i=0;i< (len/2);i++){
        if(ch2.next())
            updateNodeDirection(ch2.value, "left");
    }
    for(i=(len/2);i<len;i++){
        if(ch2.next())
            updateNodeDirection(ch2.value, "right");
        else break;
    }
    save();
    load();
    buliddata(null,"layoutleftright");
    layoutAll();
}

function rechangeLayoutLeftright(){
    var root = myDiagram.findNodeForKey(0);
    updateNodeDirection(root, "LeftRightSides");
    var chl = root.findTreeChildrenNodes();
    var ch2 = chl;
    var len = chl.count;
    for(var i=0;i< (len/2);i++){
        if(ch2.next())
            updateNodeDirection(ch2.value, "left");
    }
    for(i=(len/2);i<len;i++){
        if(ch2.next())
            updateNodeDirection(ch2.value, "right");
        else break;
    }
    save();
    load();
}

function Submissionofmodification(node){
    var text = JSON.stringify(node.data.text);
    buliddata(node,"changetext");
    save();
}

function deletechildtree(node){
    var chl = node.findTreeChildrenNodes();
    myDiagram.remove(node);
    while(chl.next()) {
        deletechildtree(chl.value);
    }
}

function changeFont(size){
    myDiagram.selection.each(function(node) {
        var tb = node.findObject("TEXT");
        var arr = tb.font.split(" ");
        arr[0] = size;
        var str = arr.join(" ");
        tb.font = str;
        buliddata(node,"changefont");
    });
}
function rechangeFont(node,fontvalue){
    myDiagram.model.setDataProperty(node.data, "font", fontvalue);
}
function changeFontfamily(value){
    myDiagram.selection.each(function(node) {
        var tb = node.findObject("TEXT");
        var arr = tb.font.split(" ");
        if (arr[0] !== "bold")
            var str = arr[0] + " " + value;
        else
            var str = arr[0] + " " + arr[1] + " " + value;
        tb.font = str;
        buliddata(node, "changefont");
    });
}

function getAdornment(){
    var nodeContextMenu =
        go.GraphObject.make(go.Adornment, "Spot",
            {background: "transparent" },  // to help detect when the mouse leaves the area
            go.GraphObject.make(go.Placeholder),
            go.GraphObject.make(go.Panel, "Auto",
                { alignment: go.Spot.TopRight },
                go.GraphObject.make(go.Shape,{
                        figure:"Rectangle",
                        stretch: go.GraphObject.Horizontal,
                        fill:"yellow"
                    }
                ),
                go.GraphObject.make(go.TextBlock, {
                        margin:new go.Margin(1, 1, 1, 1),
                        font:"bold 10pt sans-serif",
                        editable: false,
                    },
                    new go.Binding("text", "",
                        function(obj) {
                            var key =0-obj.part.adornedPart.data.key;
                            return  key; }).ofObject()
                )

            ));
    return nodeContextMenu;
}


function buliddata(){
    var data = {};
    data.op = arguments[1];
    if(arguments[0]){
        var node = arguments[0];
        data.key = node.data.key;
        if(data.key !== 0)data.parent = node.data.parent;
        else {
            data.parent = 0;
            delete data.parent;
        }
        if(arguments[1] === "changetext") data.text = node.data.text;
        else{
            data.text = node.data.text;
            delete data.text;
        }
        if(arguments[1] === "changenodecolor") data.color = arguments[2];
        else{
            data.color=node.data.color;
            delete  data.color;
        }
        if(arguments[1] === "changefont") data.font = node.data.font;
        else{
            data.font=node.data.font;
            delete  data.font;
        }
        if(arguments[1] === "changeparent")data.parent = arguments[2];
        else{
            data.parent = node.data.parent;
            delete data.parent;
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
                var newdata = { text: "分支主题", figure:"RoundedRectangle",font:node.data.font,brush: node.data.brush, dir:"left",color: node.data.color , parent: node.data.key };
            else if(node.data.dir === "right")
                var newdata = { text: "分支主题", figure:"RoundedRectangle",font:node.data.font,brush: node.data.brush, dir:"right",color: node.data.color , parent: node.data.key };
            else if(node.data.dir === "bottom")
                var newdata = { text: "分支主题", figure:"RoundedRectangle",font:node.data.font,brush: node.data.brush, dir:"bottom",color: node.data.color , parent: node.data.key };
            else
                var newdata = { text: "分支主题", figure:"RoundedRectangle",font:node.data.font,brush: node.data.brush, dir:"right",color: node.data.color , parent: node.data.key };
        }
        else var newdata = { text: "子主题", geometryString:"M 0 20 L 20 20",font:node.data.font,brush: node.data.brush, dir: node.data.dir,color: node.data.color , parent: node.data.key };
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
        rechangeLayoutLeftright();
    }else if(obj.op === "deletenode"){
        var node = myDiagram.findNodeForKey(obj.key);
        deletechildtree(node);
    }else if(obj.op === "bigger"){var node = myDiagram.findNodeForKey(obj.key);rechangeTextSize(node,1.1);}
    else if(obj.op === "smaller"){var node = myDiagram.findNodeForKey(obj.key);rechangeTextSize(node,1/1.1);}
    else if(obj.op === "bold"){var node = myDiagram.findNodeForKey(obj.key);retoggleTextWeight(node,-1);}
    else if(obj.op === "normal"){var node = myDiagram.findNodeForKey(obj.key);retoggleTextWeight(node,1);}
    else if(obj.op === "changetoEllipse"){var node = myDiagram.findNodeForKey(obj.key);rechangeShape(node,"Ellipse");}
    else if(obj.op === "changetoRoundedRectangle"){var node = myDiagram.findNodeForKey(obj.key);rechangeShape(node,"RoundedRectangle");}
    else if(obj.op === "changetoCircle"){var node = myDiagram.findNodeForKey(obj.key);rechangeShape(node,"Circle");}
    else if(obj.op === "changetoLine"){var node = myDiagram.findNodeForKey(obj.key);rechangeShape(node,"Line");}
    //else if(obj.op === "changeLevelfront"){var node = myDiagram.findNodeForKey(obj.key);rechangeLevel(node);}
    else if(obj.op === "changeLevelfront"){var node = myDiagram.findNodeForKey(obj.key);rechangeLevel(node,"front");}
    else if(obj.op === "changeLevelbehind"){var node = myDiagram.findNodeForKey(obj.key);rechangeLevel(node,"behind");}
    else if(obj.op === "changenodecolor"){var node = myDiagram.findNodeForKey(obj.key);myDiagram.model.setDataProperty(node.data, "color", obj.color);}
    else if(obj.op === "changefont"){var node = myDiagram.findNodeForKey(obj.key);rechangeFont(node,obj.font)}
    else if(obj.op === "changeparent"){var node = myDiagram.findNodeForKey(obj.key);rechangeParent(node,obj.parent)}
}


/**
 * Created by sccy on 2018/6/9/0009.
 */
const socket = io('http://47.95.194.211:3006');
var addr = window.location.href;
var arr = addr.split('=');
var id = arr[arr.length-1];

/*
保存函数
 */
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
                    $('#SaveButton').attr('disabled',true);
                    var idx = document.title.indexOf("*");
                    if (idx >= 0) document.title = document.title.substr(0, idx);
                }
            }
        }
    })
}

/*
加载函数
 */
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


/*
邀请函数
 */
function invite() {
    if($('#name').val()===''){
        $('#name').css('borderColor','#f41717');
    }else{
        socket.emit('invite',{'to':$('#name').val(),
            'from':username,
            'url':'http://47.95.194.211:3006/mind/load?id='+id
        });
        save();
        socket.on('invitesuccess',function () {
            window.location.reload();
        });

    }
}


/*
查询是否是当前页面的小组成员或者该页面是否为用户所有
 */
$(function () {

    load();//加载文件

    socket.on('inOrnot',function (data) {
        if(data.in){
            $('#LeaveButton').css('visibility','visible');//显示离开按钮
            loadteam(data.team); //加载组员

            $('#LeaveButton').bind('click',function () { //绑定离开事件
                if(pastselectednode){
                    buliddata(pastselectednode,"endselection");
                }
                socket.emit('leave',{id:id,user:username});
                window.location.href="http://47.95.194.211:3006";
            });

            socket.on('new message',function (data) { //监听同步消息
                handledata(data);
            });

            socket.on('sys',function (data) { //监听系统消息
                if(data.msg==='join'){
                    $('#sysModal').modal('show');
                    $('#member').text('用户'+data.name+'加入了小组');
                    loadteam(data.team);
                }else if(data.msg==='leave'){
                    $('#sysModal').modal('show');
                    $('#member').text('用户'+data.name+'离开了小组');
                    loadteam(data.team);
                }
            })
        }else if(!data.own){ //如果当前用户不在小组内，并且该文件也不属于该用户，则回到主页
            window.location.href="http://47.95.194.211:3006";
        }
    });
    socket.emit('rejoin',{'name':username,'roomid':id,'socketid':socket.id});

});

/*
 设置颜色
 */

$(function () {
    //设置颜色
    $("td").mouseover(function () {
        $(this).css('border','1px solid red');
    }).mouseout(function () {
        $(this).css('border','none');
    }).click(function () {
        var color = $(this).css('backgroundColor');
        myDiagram.selection.each(function(node) {
            myDiagram.model.setDataProperty(node.data, "color", color);
            buliddata(node,"changenodecolor",color);
            $('#SaveButton').attr('disabled',false);
            var idx = document.title.indexOf("*");
            if (idx < 0) document.title += "*";
        });
    });

    //设置字体
    for ( var i=9;i<20;i++){
        $("#fontslt").append("<li class='changesize'>"+i+"pt</li>");
    }
    var fonts = ["sans-serif","Impact","Georgia","Tahoma","Arial","Courier New","Consolas","SimSun","SimHei","Microsoft Yahei"];
    var fontsname = ["sans-serif","Impact","Georgia","Tahoma","Arial","Courier New","Consolas","宋体","黑体","微软雅黑"];
    for ( var i=0;i<fonts.length;i++){
        var name=fontsname[i];
        $("#fontfamily").append("<li class='changefamily'>"+name+"</li>");
    }
    $(".changesize,.changefamily").mouseover(function () {
        $(this).css('backgroundColor','#bbb');
    }).mouseout(function () {
        $(this).css('backgroundColor','white');
    });
    $(".changesize").click(function () {
        changeFont($(this).text());
    });
    $('.changefamily').click(function () {
        changeFontfamily(fonts[$(this).index()]);
    });
});



/*
加载当前组员
 */
function loadteam(team){
    $('#team').empty();
    $('#team').append('<div style="font-size: 17px;font-family: 微软雅黑;font-weight: bold">小组成员:</div>');
    for(var i=0;i<team.length;i++){
        $('#team').append('<div style="font-size: 15px;margin-top: 5px;">'+(i+1)+"."+team[i]+'</div>');
    }
}


/*
pdf下载函数
 */
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



