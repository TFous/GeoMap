/*
 * GeoMap v0.2
 * https://github.com/x6doooo/GeoMap
 *
 * Copyright 2013 Dx. Yang
 * Released under the MIT license
 */

(function($){
  var convertor = {
    "xmin": 360,
    "xmax": 0,
    "ymin": 180,
    "ymax": 0,
    "formatPoint": function(p){
      return [(p[0] < -168.5 ? p[0] + 360 : p[0]) + 170, 90 - p[1]];
    },
    //TODO:画点的方法有问题
    "makePoint": function(p){
      var self = this,
          point = self.formatPoint(p),
          x = point[0],
          y = point[1];
      if(self.xmin > x) self.xmin = x;
      if(self.xmax < x) self.xmax = x;
      if(self.ymin > y) self.ymin = y;
      if(self.ymax < y) self.ymax = y;
      return [x, y];
    },
    "Point": function(coordinates){
      coordinates = this.makePoint(coordinates);
      return coordinates.join(',');
    },
    "LineString": function(coordinates){
      var str = '',
          self = this;
      coordinates.forEach(function(point, idx){
        point = self.makePoint(point);
        if(idx == 0){
          str = 'M' + point.join(',');
        }else{
          str = str + 'L' + point.join(',');
        }
      });
      return str;
    },
    "Polygon": function(coordinates){
      var str = '';
      coordinates.forEach(function(line, idx){
        str = str + convertor.LineString(line) + 'z';
      });
      return str;
    },
    "MultiPoint": function(coordinates){
      var arr = [];
      coordinates.forEach(function(p){
        arr.push(convertor.Point(p));
      });
      return arr;
    },
    "MultiLineString": function(coordinates){
      var str = '';
      coordinates.forEach(function(line){
        str += convertor.LineString(line);
      });
      return str;
    },
    "MultiPolygon": function(coordinates){
      var str = '';
      coordinates.forEach(function(line){
        str += convertor.Polygon(line);
      });
      return str;
    }
  },
  GeoMap = function(cfg){
    var self = this,
        defaultCfg = {
          container: 'body',
          offset: null,
          scale: null,
          mapStyle: {
            'fill': '#fff',
            'stroke': '#999',
            'stroke-width': 0.7
          },
          crossline:{
            enable: true,
            color: '#ccc'
          },
          background:'#fff'
        };

    $.extend(true, defaultCfg, cfg);

    self.container = $(defaultCfg.container);
    self.width = defaultCfg.width || self.container.width();
    self.height = defaultCfg.height || self.container.height();
    self.left = self.container.offset().left;
    self.top = self.container.offset().top;
    self.canvas = new Raphael(self.container.get(0), self.width, self.height);
    self.shapes = self.canvas.set();
    self.config = defaultCfg;
    self.paths = null;
  };

  GeoMap.prototype = {
    load: function(json){
      this.paths = this.json2path(json);
    },
    render: function(){
      var self = this,
        shapes = self.shapes,
        paths = self.paths,
        canvas = self.canvas,
        config = self.config,
        style = config.mapStyle,
        offset = config.offset,
        scale = config.scale,
        background = config.background,
        crossline = config.crossline,
        width = self.width,
        height = self.height,
        left = self.left + 5,
        top = self.top + 7,
        mapleft = convertor.xmin,
        maptop = convertor.ymin,
        mapwidth = convertor.xmax - convertor.xmin,
        mapheight = convertor.ymax - convertor.ymin,
        aPath = null, linehead, linex, liney, back;

      if(!scale){
        var temx = width/mapwidth,
          temy = height/mapheight;
        temx > temy ? temx = temy : temy = temx;
        temx = temy * 0.73;
        scale = {
          x: temx,
          y: temy
        };
      }

      if(!offset){
        offset = {
          x: mapleft,
          y: maptop
        };
      }

      back = canvas.rect(mapleft, maptop, mapwidth, mapheight).scale(scale.x, scale.y, 0, 0).attr({
        'fill': background, 'stroke-width': 0
      });

      linehead = 'M' + (mapleft) + ',' + (maptop);
      linex = linehead + 'H' + convertor.xmax * scale.x;
      liney = linehead + 'V' + convertor.ymax * scale.y;

      self.crosslineX = canvas.path(linex).attr({'stroke': crossline.color, 'stroke-width': '1px'}).hide();
      self.crosslineY = canvas.path(liney).attr({'stroke': crossline.color, 'stroke-width': '1px'}).hide();

      paths.forEach(function(path){
        if(path.type == 'point' || path.type == 'MultiPoint'){
        }else{
          aPath = canvas.path(path.path).data({'properties': path.properties, 'id': path.id});
        }
        shapes.push(aPath);
      });
      canvas.setViewBox(offset.x, offset.y, width, height, false);
      shapes.attr(style).scale(scale.x, scale.y, mapleft, maptop);

      if(crossline.enable === true){
        shapes.mouseover(function(){
          showCrossLine();
        }).mousemove(function(e){
            moveCrossLine(e);
          }).mouseout(function(){
            hideCrossLine();
          });
        back.mouseover(function(){
          showCrossLine();
        }).mousemove(function(e){
          moveCrossLine(e);
        }).mouseout(function(){
          hideCrossLine();
        });
      }
      function showCrossLine(){
        self.crosslineX.toFront().show();
        self.crosslineY.toFront().show();
      }
      function moveCrossLine(e){
        var pos = getEventPos(e);
        self.crosslineX.transform('T0,'+pos.y);
        self.crosslineY.transform('T'+ pos.x + ',0');
      }
      function hideCrossLine(){
        self.crosslineX.hide();
        self.crosslineY.hide();
      }
      function getEventPos(e){
        return {
          x: parseInt(e.pageX - left) + 0.4,
          y: parseInt(e.pageY - top) + 0.4
        };
      }
    },
    setPoint: function(p){

      var self = this,
        config = self.config,
        offset = config.offset,
        scale = config.scale,
        width = self.width,
        height = self.height,
        mapleft = convertor.xmin,
        maptop = convertor.ymin,
        mapwidth = convertor.xmax - convertor.xmin,
        mapheight = convertor.ymax - convertor.ymin;

      if(!scale){
        var temx = width/mapwidth,
          temy = height/mapheight;
        temx > temy ? temx = temy : temy = temx;
        temx = temy * 0.73;
        scale = {
          x: temx,
          y: temy
        };
      }

      if(!offset){
        offset = {
          x: mapleft,
          y: maptop
        };
      }


		  // 点的默认样式
			var	a = {
					"x":0,
					"y":0,
					"r":1,
					"opacity":0.5,
					"fill": "#238CC3",
					"stroke": "#238CC3",
					"stroke-width": 0,
					"stroke-linejoin": "round"
        };
			$.extend(true, a, p);
      p = convertor.makePoint([a.x, a.y]);
      p[0] = p[0] * scale.x - mapleft - offset.x;
      p[1] = p[1] * scale.y - maptop - offset.y;
      a.x = p[0];
      a.y = p[1];
			c = self.canvas.circle(p[0], p[1], a.r).attr(a);
			return c;
    },
    json2path: function(json){
      var self = this,
        shapes = json.features,
        shapeType,
        shapeCoordinates,
        str,
        geometries,
        pathArray = [];

      convertor.xmin = 360;
      convertor.xmax = 0;
      convertor.ymin = 180;
      convertor.ymax = 0;

      shapes.forEach(function(shape, idx, arr){
        if(shape.type == 'Feature'){
          pushApath(shape.geometry, shape);
        }else if(shape.type = 'GeometryCollection'){
          geometries = shape.geometries;
          geometries.forEach(function(val){
            pushApath(val, val);
          });
        }
      });
      function pushApath(gm, shape){
        shapeType = gm.type;
        shapeCoordinates = gm.coordinates;
        str = convertor[shapeType](shapeCoordinates);
        pathArray.push({
          type: shapeType,
          path: str,
          properties: shape.properties,
          id: shape.id
        });
      }
      return pathArray;
    }
  };

  window.GeoMap = GeoMap;
})(jQuery);

