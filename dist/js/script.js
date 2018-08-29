var appKey = 'AIzaSyCG_SuyeaieZGpo9ZVCiCHZru8rseMPc8c';
var autocomplete = undefined;
var accuracy = 0;
var pos = {
    lat: undefined,
    lng: undefined
};

function init(){
    $('.geo').on('click', getGeoloc);

    var input = $('.address').get(0);
    autocomplete = new google.maps.places.Autocomplete(input, {
      location: pos
    });
    autocomplete.addListener('place_changed', function() {
        var input = $('.address').val();
        getGeocode(input);
    });

    $('.findfood').on('click', function(e){
        e.preventDefault();

        if(pos.lat && pos.lng){
          findFood();
        }
    });

    // $('.random').on('click', function(e){
    //     e.preventDefault();
    //     randomPlace();
    // });

    // $('.results').on('change', 'input[type=checkbox]', function(){
    //   if($('.results').find('input[type=checkbox]:checked').length > 0){
    //     $('.random').removeClass('disabled');
    //   } else {
    //     $('.random').addClass('disabled');
    //   }
    // });

    $('body').on('click', function(e){
      if($(e.target).closest('.popin').length < 1){
        $('body').removeClass('show-popin');
      }
    });
}

function updateLoc(lat, lng, acc, callback){
    pos.lat = lat;
    pos.lng = lng;
    accuracy = acc;

    $('.input-ctn').removeClass('loading');
    console.log(pos.lat + ',' + pos.lng + ' (accuracy :'+accuracy+')');

    var options = {
        center: {
            lat: lat,
            lng: lng
        },
        radius: acc
    };

    var circle = new google.maps.Circle(options);
    autocomplete.setBounds(circle.getBounds());

    $('.findfood').removeClass('disabled');

    if(typeof(callback) == "function"){
      callback();
    }
}
function reverseGeocoding(){
  $.ajax({
      url: "https://maps.googleapis.com/maps/api/geocode/json?latlng="+pos.lat+","+pos.lng+"&key="+appKey,
      method: "POST",

      success: function(data){
          $('.address').val(data.results[0].formatted_address);
      }
  });
}
function getGeolocFallback(){
  $.ajax({
      url: "https://www.googleapis.com/geolocation/v1/geolocate?key="+appKey,
      method: "POST",

      success: function(data){
          //console.log(data);

          var lat = data.location.lat;
          var lng = data.location.lng;
          var acc = data.accuracy;

          updateLoc(lat, lng, acc, reverseGeocoding);
      }
  });
}

function getGeoloc(){
  $('.input-ctn').addClass('loading');

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(function(position) {
      updateLoc(position.coords.latitude, position.coords.longitude, position.coords.accuracy, reverseGeocoding);
    }, function(error){
      getGeolocFallback();
    });
  } else {
    getGeolocFallback();
  }
}
function getGeocode(input){
    geocoder = new google.maps.Geocoder();
    geocoder.geocode( { 'address': input }, function(results, status) {
        //console.log(results[0].geometry.location);
        if (status == google.maps.GeocoderStatus.OK) {
            var lat = results[0].geometry.location.lat();
            var lng = results[0].geometry.location.lng();

            updateLoc(lat, lng, 0);
        }
    });
}
function findFood(){
    //$('.container').addClass('top');
    $('.results ul').empty();

    var service = new google.maps.places.PlacesService(document.createElement('div'));
    service.nearbySearch({
        location: pos,
        //radius: 1000,
        //openNow: true,
        types: ['restaurant'],
        rankBy : google.maps.places.RankBy.DISTANCE
    }, function(results, status, pagination){
        console.log(status, pagination, results);

        $('.results ul').find('.moar').remove();
        var list = '';
        $(results).each(function(i,e){
            var isopen = "";
            if(e.opening_hours){
              isopen = " <small>(closed now)</small>";

              list += '<li data-id="'+e.place_id+'">'+
              '<label><input type="checkbox" value="'+e.place_id+'" />'+
              e.name+isopen+/*' <small>'+e.vicinity+'</small>'+
              */'</label></li>';

              if(e.opening_hours.open_now){
                isopen = " <small>(open)</small>";

                list += '<li data-id="'+e.place_id+'">'+
                '<label><input type="checkbox" value="'+e.place_id+'" checked />'+
                e.name+isopen+/*' <small>'+e.vicinity+'</small>'+
                */'</label></li>';
              }
            } else {
              list += '<li data-id="'+e.place_id+'">'+
              '<label><input type="checkbox" value="'+e.place_id+'" />'+
              e.name+isopen+/*' <small>'+e.vicinity+'</small>'+
              */'</label></li>';
            }

        });
        if(pagination.hasNextPage)
            list += '<li class="moar"><a href="#">Display more results...</a></li>';


        $('.results ul').append(list);

        $('.moar a').on('click', function() {
            pagination.nextPage();
        });

        randomPlace();
    });
}

function randomPlace(){
    var selected = new Array();

    $('.results li').each(function(i,e){
        if($(e).find('input').is(':checked')){
            selected.push($(e).attr('data-id'));
        }
    });

    if(selected.length > 0){
        var randomIndex = Math.floor(Math.random() * selected.length);
        var randomId = selected[randomIndex];

        /*$.ajax({
            url: "https://maps.googleapis.com/maps/api/place/details/json?placeid="+randomId+"&key="+appKey,
            method: "GET",
            dataType: 'json',

            success: function(data){
                console.log(JSON.parse(data));
            }
        });*/


        var map = new google.maps.Map(document.getElementById('map-canvas'), {
            center: new google.maps.LatLng(0, 0),
            zoom: 15
        });

        var service = new google.maps.places.PlacesService(map);

        service.getDetails({
            placeId: randomId
        }, function (place, status) {
            console.log(place);
            if (status === google.maps.places.PlacesServiceStatus.OK) {
              var result = '<h3>'+place.name+'</h3><p>';
              if(place.rating !== undefined){
                result += '<strong>Rating:</strong> '+place.rating+'/5<br />';
              }
              if(place.plus_code.compound_code !== undefined){
                result += '<strong>Plus code:</strong> '+place.plus_code.compound_code+'<br />';
              }
              if(place.formatted_address !== undefined){
                result += '<strong>Address:</strong><br />'+place.formatted_address+'<br />';
              }
              if(place.formatted_phone_number !== undefined){
                result += '<strong>Phone:</strong> <a href="tel:'+place.formatted_phone_number+'">'+place.formatted_phone_number+'</a><br />';
              }
              if(place.url !== undefined){
                result += '<br /><a href="'+place.url+'">Maps</a><br />';
              }
              result += '</p>';

              if(place.photos !== undefined){
                result += '<p><img src="'+place.photos[0].getUrl({"maxWidth": 600, "maxHeight": 400})+'" alt="" /></p>';
              }

              $('.popin').html(result);
              $('body').addClass('show-popin');
            }
        });


        //$('.results').find('h3').remove();
        //$('.results').prepend('<h3>'+selected[randomIndex]+'</h3>');
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./js/sw.js').then(function(reg) {
        console.log('Successfully registered service worker', reg);
    }).catch(function(err) {
        console.warn('Error whilst registering service worker', err);
    });
}

window.addEventListener('online', function(e) {
    $('.offlinemsg').slideUp();
    $('.address').prop('disabled', false);
}, false);

window.addEventListener('offline', function(e) {
    $('.offlinemsg').slideDown();
    $('.address').prop('disabled', true);
}, false);

if (navigator.onLine) {
  $('.offlinemsg').slideUp();
  $('.address').prop('disabled', false);
} else {
  $('.offlinemsg').slideDown();
  $('.address').prop('disabled', true);
}
