var element = undefined;


function update_barcode(element, value){
    JsBarcode(element, value, {
        format: "CODE128",
        displayValue: false,
        margin: 0
    });
}

function get_supplier_url(element_supplier){
	if (element_supplier.url && element_supplier.url.length > 3){
		return element_supplier.url
	}
	switch(element_supplier.supplier){
		case 'TME':
			return "https://www.tme.eu/cz/details/"+(element_supplier.symbol.replace('/', '_') || "Err");
			break;
    case 'Mouser':
      return "https://cz.mouser.com/ProductDetail/"+element_supplier.symbol;
      break;
		default:
			return null;
			break;
	}
}


function cleanSimpleCode(tag){
  var val = $(tag).val();
  val = val.toLoverCase();
  val = val.replace(' ','_');
  val = val.replace('__','_');
  val = val.replace('__','_');
  val = val.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g,'');
  $(tag).val(val)
}

$('#inputNAME_edit').on('change', function(e){
  if ($('#inputBARCODE_edit').val() == null){
    $('#inputBARCODE_edit').val($('#inputNAME_edit').val());
    cleanSimpleCode('#inputBARCODE_edit');
  }
})


$('#inputBARCODE_edit').on('change',function(e){
  console.log(e);
  cleanSimpleCode('#inputBARCODE_edit');
})

// NASTAVENI MODALU PRO UPRAVU POLOZKY
// nacneni polozky dle jmena
function OpenArticleEdit(name = null, clear = true, show = true){
    console.log('OpenArticleEdit', name, clear);
    if (clear == true){ClearArticleEdit();}

    $('#modal_oper_place').empty();
    $('#modal_oper_place').hide();

    var table = new Tabulator("#edit-parameters-table");
    table.clearData();


    if (name === null){name = product_json['_id'].$oid}
    element = undefined;
    if(show){
        $('#modal-edit-component').modal('show');
    }
    $('#inputCATEGORY_edit').select2({ width: '100%' });
    $('#new_supplier_name').select2({
        width: '100%',
        tags: true,
        multiple: true,
        maximumSelectionLength: 1,
        ajax: {
          url: '/store/api/get_suppliers/',
          type: "POST",
          dataType: 'json',
          processResults: function (data) {
              console.log(data)
              return {
                  results: $.map(data, function (item) {
                      console.log(item);
                      return {
                          text: item,
                          id: item
                      }
                  })
              };
          }
        }
    })

    try {
        $.ajax({
            type: "POST",
            url: "/store/api/product/",
            data: {
                'type':'filter',
                'key':'_id',
                'value': name,
                //'selected': active_categories(),
                //'polarity': $('#category_polarity').is( ":checked" )
            },
            success: function( data, textStatus, jQxhr ){
                element = data[0]
                console.log(element);

                JsBarcode("#edit_barcode",element['barcode'][0], {
                    format: "CODE128",
                    displayValue: false,
                    margin: 0
                });

                if (element == undefined){
                    Lobibox.notify('warning', {
                        title: 'Neznámá položka',
                        msg: 'Položka s tímto ID ještě není zadána ve skladu. Pokračováním vytvoříte novou položku.',
                        delay: 5000,
                        icon: false
                    });
                    product_json = {
                        '_id': id,
                        'name': id,
                        'stock':{},
                        'price':0,
                        'description':'',
                        'category': [],
                    }
                    element = product_json;
                    return 0;
                }else{
                  $('#inputID_edit').val(element['_id'].$oid);
                  $("#inputID_edit").attr('disabled', true);
                  $('#inputNAME_edit').val(element['name'] || "Bez názvu");
                  $('#inputPRICEp_edit').val(element['price_sell'] || 0);
                  $('#inputSELLABLE_edit').prop('checked', element['sellable'] || false);
                  $('#inputDESCRIPTION_edit').val(element['description'] || "");
                  $('#inputCATEGORY_edit').val(element['category']).trigger('change');
                  $('#inputBARCODE_edit').val(element['barcode'][0]);
                  $("#inputBARCODE_edit").attr('disabled', true);
                  $('#inputSNREQUIED_list').val(element['sn_requied']||false);

                  draw_parameters();
                  draw_supplier();
                  draw_stock(element);
                  draw_tags();
                  draw_barcodes(element['barcode']);
                  draw_history(element['_id'].$oid);
                }

            },
            error: function( jqXhr, textStatus, errorThrown ){
                console.log( errorThrown );
                Lobibox.notify('error', {
                    msg: 'Načtení položky neproběhlo úspěšně: ' + errorThrown,
                    icon: false,
                });
            }
        });

    }catch(err){
        alert("načítání se nezdařilo. Pro více informací navštivte konzoli... :-( Omlouvám se...");
    }
}

function ClearArticleEdit(){
    $('#inputID_edit').val(null);
    $("#inputID_edit").attr('disabled', true);
    $('#inputNAME_edit').val(null);
    $('#inputPRICE_edit').val(0);
    $('#inputPRICEp_edit').val(0);
    $('#inputSELLABLE_edit').prop('checked', false);
    $('#inputDESCRIPTION_edit').val(null);
    $('#inputCATEGORY_edit').val(null).trigger('change');
    $('#inputTAG_edit').val(null).trigger('change');
    $('#inputBARCODE_edit').val(null);
    $("#inputBARCODE_edit").attr('disabled', true);

    $('#inputSTOCK_list').empty();
    $('#inputHISTORY_edit').empty();
    $('#inputSUPPLIER_list').empty();

    $('#new_param_name').val(null);
    $('#new_param_value').val(null);

    $('#new_supplier_code').val(null);
    $('#new_supplier_symbol').val(null);
    $('#new_supplier_url').val(null);


    $('#modal_oper_place').empty();
    $('#modal_oper_place').hide();
}


//
// Aktualizovat promennou soucastky z karty produktu
//

function UpdateFromForm(){
    if(element === undefined){element = {}}
    element['_id'] = $('#inputID_edit').val();
    element['name'] = $('#inputNAME_edit').val();
    element['description'] = $('#inputDESCRIPTION_edit').val();
    element['sellable'] = $('#inputSELLABLE_edit').prop('checked');
    element['price_sell'] = Number($('#inputPRICEp_edit').val());
    element['category'] = $('#inputCATEGORY_edit').val();
    element['barcode'] = [$('#inputBARCODE_edit').val()];
    element['sn_required'] = false;

    tags = [];
    for (tag in $('#inputTAG_edit').val()){
        tags = tags.concat( {'id': $('#inputTAG_edit').val()[tag]} );
    }
    element['tags'] = tags;
    console.log(element);
}


//
// Ulozit soucastku z karty produktu
//
function WriteToDb(){
    UpdateFromForm();
    $.ajax({
        type: "POST",
        //contentType: "application/json; charset=utf-8",
        url: "/store/api/update_product/",
        data: {json: JSON.stringify(element)},
        success: function( data, textStatus, jQxhr ){
            console.log(textStatus);
            Lobibox.notify('success', {
                msg: 'Polozka uspesne ulozena: ' + textStatus,
                icon: false,
            });
            $('#modal-edit-component').modal('hide');
        },
        error: function( jqXhr, textStatus, errorThrown ){
            console.log( errorThrown );
            Lobibox.notify('error', {
                msg: 'Ukladani nove polozky nebylo uspesne: ' + errorThrown,
                icon: false,
            });
        }
    });
}

function add_parameter(){

  element.parameters.push({'name': $('#select-component-parameters-edit').val(),
                            'value': $('#value-component-parameters-edit').val()})

  draw_parameters();
}

function rm_parameter(id){
    element.parameters.splice(id, 1);
    draw_parameters();
}

function move_param(id, dir){
    var move = element.parameters[id];
    element.parameters.splice(id, 1);
    element.parameters.splice(id+dir, 0, move);
    draw_parameters();
}


function draw_parameters(){
  if (element.parameters == undefined){
    element['parameters'] = [];
  }
  var parameters = element.parameters

  // if (element === undefined || element.parameters == undefined || parameters === undefined || parameters == {} || Array.isArray(parameters) == false){
  //   var parameters = [];
  //   $("#new_param_id")[0].value = 1;
  // }else{
  //   var parameters = element.parameters;
  // }
  $("#param_table_body").empty();
  console.log("All", parameters);

  var table = new Tabulator("#edit-parameters-table",{
    layout:"fitColumns",
    columns:[
        {title:"#", field:"id", sorter:"number", width: 25, editable:false},
        {title:"Parametr", field: "name", editable:false},
        {title:"Hodnota", field: "value", editable:false},
        {title:"Veličina", field:"unitn", editable:true, sorter:"string"},
    ],
    addRowPos:"bottom",
    cellEdited:function(cell){
      console.log("EDITED");
      console.log(cell);
    },
  });
  table.setData(parameters);

  //element['parameters'] = parameters;
}








function clear_supplier(){
    var id =
    $('#new_supplier_name').val(null).trigger('change');
    $('#new_supplier_id').val((element.supplier || []).length+1);
    $('#new_supplier_symbol').val('');
    $('#new_supplier_code').val('');
    $('#new_supplier_bartype').val('');
    $('#new_supplier_url').val('');
}

function add_supplier(){
  var data = {
        "supplier":$('#new_supplier_name').val()[0],
        "symbol": $('#new_supplier_symbol')[0].value,
        "barcode":$('#new_supplier_code')[0].value,
        "url":$('#new_supplier_url')[0].value
  };
  if(element === undefined){
      element = {};
  }
  if ((element.supplier || []).length < Number($('#new_supplier_id')[0].value)){
      if (element.supplier === undefined){
          console.log("Toto jeste neni definovane");
          element.supplier = [];
      }
      var nid = element.supplier.push(data);
  } else {
      element.supplier[Number($('#new_supplier_id')[0].value)-1] = data;
  }
    $("#new_supplier_id").val((element.supplier).length+1);
    draw_supplier();
    clear_supplier();
    $('#collapseOne').collapse('hide');
}

function rm_supplier(id){
    //element.supplier.splice(id, 1);
    if(!!element.supplier[id].disabled && element.supplier[id].disabled == 1){
        element.supplier[id]['disabled'] = 0;
    }else{
        element.supplier[id]['disabled'] = 1;
    }
    draw_supplier();
}

function ed_supplier(id){
    //$('#new_supplier_name').val(null).trigger('change');
    $('#new_supplier_name').val(null).append(new Option(element.supplier[id].supplier, element.supplier[id].supplier, true, true)).trigger('change');
    $('#new_supplier_id')[0].value = id+1;
    $('#new_supplier_symbol')[0].value = (element.supplier[id].symbol) || '';
    $('#new_supplier_code')[0].value = (element.supplier[id].barcode) || '';
    $('#new_supplier_bartype')[0].value = (element.supplier[id].bartype) || '';
    $('#new_supplier_url')[0].value = (element.supplier[id].url) || '';
    $('#collapseOne').collapse('show');
}

function draw_supplier(){
  if (element.supplier === undefined){var parameters = []}
  else{var parameters = element.supplier;}

  $("#inputSUPPLIER_list").empty();
  $("#new_supplier_id")[0].value = (parameters).length+1;
  for (param in parameters){
    var p = parameters[param];

    var html = "<div class='card p-2 m-0 mt-1 row' >"+
                "<div class='col-auto mr-auto'><span>"+ "#"+(Number(param)+1).toString()+ "  "+
                p.supplier + "</span> - "+
                "<span>"+ p.symbol + "</span></div>"+
                "<div class='btn-group btn-group-justified col-auto'>"+
                "<a class='btn btn-sm btn-outline-success' onclick='ed_supplier("+param+")'><i class='material-icons'>edit</i></a>"+
                "<a class='btn btn-sm btn-outline-primary' href='" + p.url + "' target='_blank' ><i class='material-icons'>link</i></a>"+
                "<a class='btn btn-sm btn-outline-danger' onclick='rm_supplier("+param+")'><i class='material-icons isrm'></i></a></div>"+
                "</div>";
    var $html = $('<div />',{html:html});

    if((p.disabled || 0) == 1){
        $html.find('.card').addClass('text-muted');
        $html.find('.card').addClass('bg-light');
        $html.find('.isrm').html('check_circle_outline');
    }else{
        $html.find('.card').addClass('bg-light');
        $html.find('.isrm').html('highlight_off');
    }

    $("#inputSUPPLIER_list").append($html.html());

  }
}

function draw_stock(count){
  console.log("Count>>", count);
  $("#inputSTOCK_list").empty();
  //$("#inputSTOCK_list").append('celkovy pocet je ' + count.count || 'NDEF'+'<br>');
  console.log(count.count_part);
  $('#inputSTOCK_list').append('<div class="card m-0 p-2 mr-2 bg-success"> Celkem <br>' + count.count_part.suma[0].count + ' u </div>');

  for (lci in count.count_part.by_warehouse){
      var lc = count.count_part.by_warehouse[lci];

      console.log("TEST...", lc)
      var html = "<div class='card m-0 p-2 mr-2'>"+ lc.warehouse[0].name + "<br>" + lc.count +" units </div>";
      $("#inputSTOCK_list").append(html);
  }


  // for (param in count.stock){
  //   var c = count.stock[param];
  //   console.log(c);
  //   var num = c.bilance || 'Ndef';
  //   if (permis == 0){
  //       if(num > 100){
  //           num = '100+';
  //       } else if(num > 10){
  //           num = '10+';
  //       } else {
  //           num = num;
  //       }
  //     }
  //     var html = "<div class='card m-0 p-2 mr-2'>"+ c._id + "<br>" + num +" units </div>";
  //     $("#inputSTOCK_list").append(html);
  //   }
}

function draw_tags(){
    $("#inputTAG_edit").select2({
        tags: true,
        width: '100%',
        ajax: {
          url: '/store/api/get_tags/',
          type: "POST",
          dataType: 'json',
          processResults: function (data) {
              console.log(data)
              return {
                  results: $.map(data, function (item) {
                      console.log(item);
                      return {
                          text: item,
                          id: item
                      }
                  })
              };
          }
        }
    });
    $('#inputTAG_edit').val(null).trigger('change');
    for (i in element.tags || []){
        tag = element.tags[i];
        $('#inputTAG_edit').append(new Option(tag.id, tag.id, true, true)).trigger('change');
    }
}


function draw_barcodes(codes){
  /*
  TODO...
  $('#inputBARCODE_edit').select2({
    tags: true,
    multiple: true,
    width: '100%',
    data: codes
  });
  $('#inputBARCODE_edit').val(codes);
  $('#inputBARCODE_edit').toggle('change');
  */
  $('#inputBARCODE_edit').val(codes[0]);
}

function draw_history(id){
    $('#inputHISTORY_edit').empty();
    $.ajax({
        type: "POST",
        url: "/store/api/get_history/",
        data: {
            'key':id,
            'output': 'html_tab'
        },
        success: function( data, textStatus, jQxhr ){
            $("#inputHISTORY_edit").html(data);

        }
    });
}



function new_component(){
    element = {};
    //$('#modal-edit-component').modal('hide');
    $('#modal-edit-component').modal('show');
    $('#inputCATEGORY_edit').select2({ width: '100%' });

    ClearArticleEdit();
}
