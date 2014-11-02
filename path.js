(function () {

  // a simple airplane shape on a 500x500 canvas
  var airplanePath = 'M250.2,59.002c11.001,0,20.176,9.165,20.176,20.777v122.24l171.12,95.954v42.779l-171.12-49.501v89.227l40.337,29.946v35.446l-60.52-20.18-60.502,20.166v-35.45l40.341-29.946v-89.227l-171.14,49.51v-42.779l171.14-95.954v-122.24c0-11.612,9.15-20.777,20.16-20.777z';

  function airplane(node, ang) {
    var group = node.append('g').classed('path-airplane', true);

    ang = ang || 0;
    ang = 180 - ang * 180 / Math.PI;
    group.append('g')
        .attr('transform', 'rotate(' + ang + ')')
      .append('path')
        .attr('d', airplanePath)
        .attr('transform', 'scale(.05) translate(-250,-250)');

    return group;
  }

  var currentTime = null;
  var playing = false;
  var animating = false;
  var transitioning = false;
  var transitionNext = false;
  var now, nData;

  // draw animation icons
  function loadIcons() {
    var body = d3.select('body');
    var buttonBox = body.append('div').attr('class', 'path-buttons').append('div');

    // don't let mousedown on button event propagate the map
    buttonBox.on('mousedown', function () {
      d3.event.stopPropagation();
    });

    buttonBox.append('div').attr('class', 'btn btn-default btn-lg path-first')
      .append('span').attr('class', 'glyphicon glyphicon-fast-backward');
    buttonBox.append('div').attr('class', 'btn btn-default btn-lg path-back')
      .append('div').attr('class', 'glyphicon glyphicon-step-backward');
    buttonBox.append('div').attr('class', 'btn btn-default btn-lg path-play')
      .append('div').attr('class', 'glyphicon glyphicon-play');
    buttonBox.append('div').attr('class', 'btn btn-default btn-lg path-step')
      .append('div').attr('class', 'glyphicon glyphicon-step-forward');
    buttonBox.append('div').attr('class', 'btn btn-default btn-lg path-end')
      .append('div').attr('class', 'glyphicon glyphicon-fast-forward');

    // draw a date box
    body.append('div').attr('class', 'path-date');

    // draw an info box
    body.append('div').attr('class', 'path-description')
      .on('click', function () {
        d3.event.stopPropagation();
      });
  }

  // Data for when the outbreak spread to each country (estimated)
  // obtained from:
  //   http://en.wikipedia.org/wiki/Ebola_virus_epidemic_in_West_Africa
  // and references therein.
  var duration = 500;
  var data = [
    {
      date: new Date('December 6, 2013'),
      country: 'Guinea',
      link: 'http://edition.cnn.com/2014/10/28/health/ebola-patient-zero/index.html',
      lon: -9.180,
      lat: 9.344,
      extent: {
        duration: duration,
        center: {x: -12.5, y: 8.4},
        zoom: 3.64
      },
      description: [
        'The ongoing Ebola outbreak in West Africa is believed to have ',
        '<a href="http://edition.cnn.com/2014/10/28/health/ebola-patient-zero/index.html" ',
        'target="path">started</a> ',
        'on December 6, 2013 in southern Guinea when a 2-year-old boy died of ',
        'the disease.  A short time later, several members of his family as ',
        'well as the doctor treating him also fell ill.'
      ].join('')
    },
    {
      date: new Date('March 1, 2014'),
      country: 'Liberia',
      source: 'Guinea',
      link: 'http://www.who.int/csr/don/2014_03_27_ebola/en/',
      lon: -10.800,
      lat: 6.317,
      extent: {
        duration: 0,
        center: {x: -12.5, y: 8.4},
        zoom: 3.64
      },
      description: [
        'By late April of 2014, the outbreak had spread into Liberia from ',
        'Guinea.  A ',
        '<a href="http://www.who.int/csr/don/2014_03_27_ebola/en/" ',
        'target="path">WHO report</a> on March 1st reported that outbreak ',
        'in Guinea had increased to 103 including 66 deaths.'
      ].join('')
    },
    {
      date: new Date('May 15, 2014'),
      country: 'Sierra Leone',
      source: 'Guinea',
      link: 'http://www.who.int/csr/don/2014_03_27_ebola/en/',
      lon: -13.234,
      lat: 8.484,
      extent: {
        duration: 0,
        center: {x: -12.5, y: 8.4},
        zoom: 3.64
      },
      description: [
        'Around the same time, the WHO reported that the epidemic had also ',
        'spread into Sierra Leone; however, the government of Sierra Leone  ',
        '<a href="http://news.sl/drwebsite/publish/article_200525069.shtml" ',
        'target="path">reported</a> no cases had yet been found.  By late May, ',
        'the outbreak in Sierra Leone was confirmed when ',
        '<a href="http://www.reuters.com/article/2014/05/26/us-ebola-leone-idUSKBN0E614G20140526" ',
        'target="path">5 deaths</a> were reported.'
      ].join('')
    },
    {
      date: new Date('July 20, 2014'),
      country: 'Nigeria',
      city: 'Lagos',
      source: 'Liberia',
      link: 'http://www.who.int/csr/don/2014_07_27_ebola/en/',
      lon: 3.396,
      lat: 6.453,
      extent: {
        duration: duration,
        center: {x: -1.85, y: 7.8},
        zoom: 2.66
      },
      description: [
        'On <a href="http://www.who.int/csr/don/2014_07_27_ebola/en/" target="path">July 20th',
        '</a>, an infected man flew from Liberia to Lagos, Nigeria ',
        'and died a few days later.  By September 22nd, the ',
        '<a href="http://apps.who.int/iris/bitstream/10665/134449/1/roadmapupdate22sept14_eng.pdf" ',
        'target="path">WHO reported</a> 20 confirmed cases in Nigeria.'
      ].join('')
    },
    {
      date: new Date('August 11, 2014'),
      country: "Dem. Rep. Congo",
      city: 'Boende',
      link: 'http://www.who.int/csr/don/2014_08_27_ebola/en/',
      lon: 20.876,
      lat: -0.281,
      extent: {
        duration: duration,
        center: {x: 6.23, y: 1.02},
        zoom: 2.18
      },
      description: [
        'The WHO reported that on <a href="http://www.who.int/csr/don/2014_08_27_ebola/en/" target="path">',
        'August 11, 2014</a> a woman in the Democratic Republic of Congo had died of Ebola.  It ',
        'is believed that she had contracted the illness from an animal and it was unrelated to the ',
        'outbreak in Guinea.'
      ].join('')
    },
    {
      date: new Date('August 29, 2014'),
      country: 'Senegal',
      city: 'Dakar',
      source: 'Guinea',
      link: 'http://www.who.int/csr/don/2014_08_30_ebola/en/',
      lon: -17.447,
      lat: 14.693,
      extent: {
        duration: duration,
        center: {x: -11.6, y: 9.89},
        zoom: 3.53
      },
      description: [
        'On <a src="http://www.who.int/csr/don/2014_08_30_ebola/en/" target="path">',
        'August 29th</a>, a resident of Guinea arrived in Dakar, Senegal.  Several ',
        'days later, he began showing signs of Ebola and sought medical care.  The ',
        'man eventually recovered and no further incidents have occured.'
      ].join('')
    },
    {
      date: new Date('September 25, 2014'),
      country: 'Spain',
      city: 'Madrid',
      source: 'Sierra Leone',
      link: 'http://www.bbc.com/news/world-europe-29516882',
      lon: -3.683,
      lat: 40.400,
      extent: {
        duration: duration,
        center: {x: -43.5, y: 26.4},
        zoom: 0.435
      },
      description: [
        'In <a href="http://www.bbc.com/news/world-europe-29516882" target="path">',
        'September 2014</a>, a spanish missionary who had been evacuated from Sierra ',
        'Leone died in a Madrid hospital.  A nurse who had treated him was confirmed ',
        'to have contracted the disease on October 7.'
      ].join('')
    },
    {
      date: new Date('September 30, 2014'),
      country: 'United States',
      city: 'Dallas',
      source: 'Liberia',
      link: 'http://www.nytimes.com/interactive/2014/10/01/us/retracing-the-steps-of-the-dallas-ebola-patient.html',
      lon: -96.797,
      lat: 32.776,
      extent: {
        duration: duration,
        center: {x: -43.5, y: 26.4},
        zoom: 0.435
      },
      description: [
        'On <a href="http://www.nytimes.com/interactive/2014/10/01/us/retracing-the-steps-of-the-dallas-ebola-patient.html" target="path">',
        'September 19, 2014</a> a man arrived in Dallas from Monrovia, Liberia.  His initial screening prior to bording the ',
        'flight showed no signs of illness.  On September 24, he fell ill and sought care at a nearby ',
        'hospital, but was sent home.  After his conditioned worsened, he returned to the hospital several ',
        'days later.  On September 30th, blood tests confirmed that he had contracted Ebola.'
      ].join('')
    },
    {
      date: new Date('October 23, 2014'),
      country: 'United States (no match)',
      city: 'New York City',
      source: 'Guinea',
      link: 'http://www.nbcnews.com/storyline/ebola-virus-outbreak/new-york-doctor-just-back-africa-has-ebola-n232561',
      lon: -74.006,
      lat: 40.713,
      extent: {
        duration: duration,
        center: {x: -43.5, y: 26.4},
        zoom: 0.435
      },
      description: [
        'On <a href="http://www.nbcnews.com/storyline/ebola-virus-outbreak/new-york-doctor-just-back-africa-has-ebola-n232561" ',
        'target="path">October 23</a>, a doctor from Doctors without Borders tested positive for Ebola in ',
        'New York City after returning from Guinea several days prior.'
      ].join('')
    },
    {
      date: new Date('October 24, 2014'),
      country: 'Mali',
      city: 'Kayes',
      source: 'Guinea',
      link: 'http://abcnews.go.com/Health/wireStory/threat-break-isolation-liberia-food-26399022',
      lon: -11.433,
      lat: 14.450,
      extent: {
        duration: duration,
        center: {x: -4.72, y: 14.56},
        zoom: 2.66
      },
      description: [
        'On <a href="http://abcnews.go.com/Health/wireStory/threat-break-isolation-liberia-food-26399022" ',
        'target="path">October 23</a> an official from Mali confirmed that a 2-year-old girl from Guinea ',
        'had tested positive for Ebola in the Malian town of Keyes.'
      ].join('')
    }
    // + medical evacuations:
    // http://en.wikipedia.org/wiki/Ebola_virus_epidemic_in_West_Africa#Countries_with_medically_evacuated_cases
  ];

  // sort by date
  data = data.sort(function (a, b) {
    return d3.ascending(a.date.valueOf(), b.date.valueOf());
  });

  var color = d3.scale.category10().domain(data.map(function (d) { return d.country; }));
  var svg = null;
  var renderer = null;

  function createPathView(myMap, featureLayer) {

    function extentNorm(e) {
      var dx, dy, dz;
      dx = (myMap.center().x - e.center.x);
      dy = (myMap.center().y - e.center.y);
      dz = 10 * (myMap.zoom() - e.zoom);

      return Math.sqrt((dx * dx + dy * dy) * Math.pow(2, myMap.zoom()) + dz * dz);
    }

    var _duration;
    loadIcons();
    window.myMap = myMap;
    svg = featureLayer.canvas();
    renderer = featureLayer.renderer();
    var borders = svg.append('g');

    function drawTime(t) {
      if (transitioning) {
        if (!transitionNext) {
          transitionNext = true;
          window.setTimeout(function () {
            transitionNext = false;
            drawTime(t);
          }, 100);
        }
        return;
      }
      d3.select('.path-date').text(t.toDateString());
      d3.select('.path-description').style('display', 'none');
      var filtered = data.filter(function (d) { return d.date <= t; })
        .map(function (d) { return d.country; });

      var extent = $.extend({}, data[filtered.length - 1]).extent;

      _duration = 0;
      if (extentNorm(extent) > 1) {
        _duration = duration;
      }

      data.forEach(function (d, j) {
        var i = filtered.indexOf(d.country);
        if (d.trail && (i < 0 || j === filtered.length - 1)) {
          d.trail.remove();
        }
        if (j === filtered.length - 1 && data[j].description) {
          d3.select('.path-description').style('display', null)
            .html(data[j].description);
        }
      });
      d3.selectAll('line.trail').style('stroke-opacity', 0.5);

      extent.duration = _duration;
      transitioning = true;
      if (_duration > 0) {
        d3.select('.path-buttons').selectAll('.btn').classed('disabled', true);
        myMap.transition(extent);
      }

      window.setTimeout(function () {

        modifyButtonState(now, nData);
        transitioning = false;
        var selection = app.util.drawBorders(filtered, borders, renderer);
        selection
          .attr('display', function (d) {
            if (d.name === filtered[filtered.length - 1]) {
              return 'none';
            } else {
              return null;
            }
          })
          .style('fill', function (d) {
            return color(d.name);
          })
          .style('fill-opacity', 0.7);

        var current = data[filtered.length - 1];
        var sourceName = current.source;
        var source, interp;
        var pt0, pt1, pt2, airplaneIcon, trail, t_saved = 0;

        trail = svg.append('line')
          .attr('class', 'trail')
          .attr('stroke', d3.rgb(color(sourceName)).darker())
          .style('stroke-linecap', 'round')
          .style('stroke-opacity', 1);
        current.trail = trail;

        function getTransform(t) {
          var scl = renderer.scaleFactor();
          var pt, origin;
          var angle;
          if (t !== undefined) {
            t_saved = t;
            pt0 = interp(t);
          }
          pt = renderer.worldToDisplay({
            x: pt0[0],
            y: pt0[1]
          });
          origin = renderer.worldToDisplay({
            x: pt1[0],
            y: pt1[1]
          });
          trail.attr('x1', origin.x)
            .attr('y1', origin.y)
            .attr('x2', pt.x)
            .attr('y2', pt.y)
            .style('stroke-width', 5/scl);

          return 'translate(' + pt.x + ',' + pt.y + ') scale(' + (1 - 4 * t_saved * (t_saved - 1))/scl + ')';
        }

        function scaleAirplane() {
          airplaneIcon.attr(
            'transform',
            getTransform()
          );
        }

        if (sourceName) {

          data.forEach(function (d) {
            if (d.country === sourceName) {
              source = d;
            }
          });
          pt1 = [source.lon, source.lat];
          pt2 = [current.lon, current.lat];
          pt0 = pt1.slice();
          interp = d3.interpolate(pt1, pt2);

          var v0, v1;
          v0 = renderer.worldToDisplay({
            x: pt1[0],
            y: pt1[1]
          });
          v1 = renderer.worldToDisplay({
            x: pt2[0],
            y: pt2[1]
          });
          angle = Math.atan2(v1.x - v0.x, v1.y - v0.y);
          airplaneIcon = airplane(svg, angle);
          scaleAirplane();

          airplaneIcon.transition()
            .duration(3000)
            .attrTween('transform', function () { return getTransform; })
            .each('end', function () {
              svg.selectAll('path.border').attr('display', null);
            }).remove();
          featureLayer.geoOn(geo.event.d3Rescale, scaleAirplane);

        } else {
          svg.selectAll('path.border').attr('display', null);
          trail.remove();
        }

      }, _duration * 1.1
      );
    }

    function modifyButtonState(i, n) {
      if (playing) {
        d3.selectAll('.path-buttons .btn').classed({'disabled': true});
        d3.select('.path-play').classed({
          'btn-success': false,
          'btn-danger': true,
          'disabled': false
        })
        .select('div').classed({
          'glyphicon-play': false,
          'glyphicon-pause': true
        });
      } else {
        d3.selectAll('.path-buttons .btn').classed({'disabled': false});
        d3.select('.path-play').classed({
          'btn-success': true,
          'btn-danger': false
        })
        .select('div').classed({
          'glyphicon-play': true,
          'glyphicon-pause': false
        });
      }
      if (i <= 0) {
        d3.select('.path-first').classed({'disabled': true});
        d3.select('.path-back').classed({'disabled': true});
      } else if (i >= n - 1) {
        d3.select('.path-end').classed({'disabled': true});
        d3.select('.path-step').classed({'disabled': true});
      }
    }

    window.app.util.load(function () {
      // for times...
      now = 0;
      nData = data.length;
      var n = nData;
      drawTime(data[now].date);

      function run() {
        if (playing) {
          now = (now + 1) % n;
          modifyButtonState(now, n);
          drawTime(data[now].date);
          window.setTimeout(run, 10000);
        }
        modifyButtonState(now, n);
      }

      d3.select('.path-first').on('click', function () {
        if (now !== 0) {
          now = 0;
          modifyButtonState(now, n);
          drawTime(data[now].date);
        }
      });
      d3.select('.path-back').on('click', function () {
        now -= 1;
        modifyButtonState(now, n);
        drawTime(data[now].date);
      });
      d3.select('.path-play').on('click', function () {
        playing = !playing;
        modifyButtonState(now, n);
        run();
      });
      d3.select('.path-step').on('click', function () {
        now += 1;
        modifyButtonState(now, n);
        drawTime(data[now].date);
      });
      d3.select('.path-end').on('click', function () {
        if (now !== data.length - 1) {
          now = data.length - 1;
          modifyButtonState(now, n);
          drawTime(data[now].date);
        }
      });
      modifyButtonState(now, n);
    });
  }

  function destroyPathView() {
    if (svg) {
      svg.selectAll('*').remove();
    }
    d3.selectAll('.path-buttons').remove();
    d3.selectAll('.path-date').remove();
    d3.selectAll('.path-airplane').remove();
    d3.selectAll('.path-description').remove();
    transitioning = false;
    playing = false;
    transitionNext = false;
  }

  window.app.path = {
    create: createPathView,
    destroy: destroyPathView
  };
})();