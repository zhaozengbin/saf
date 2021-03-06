var background_colors;

function init_step4_form() {
    layui.use('form', function () {
        var form = layui.form;
        var form_id = '#form_best_recommend_setting';
        $('#button_recommend_setting').bind('click', function () {
            connect_step4();
            reload_step4_ui(true);
            $('#recommend_model_tbody').children('tr').remove();
            var formData = $(form_id).serializeJSON();
            formData.kmeans_training_proportion = $('#kmeans_training_proportion').val();
            formData.kmeans_validata_proportion = $('#kmeans_validata_proportion').val();
            formData.kmeans_test_proportion = $('#kmeans_test_proportion').val();
            http_utils.postData(monitor_path + '/mllib/kmeans/execute', JSON.stringify(formData), true, function (data) {
                if (data) {
                    if (data.status == 200) {
                        saf_layui.loding_increase('preview_kmeans', 2);
                    } else if (data.data && data.data.indexOf("{") >= 0 && data.data.indexOf("}") > 0) {
                        layer.alert(JSON.parse(data.data).exception);
                    } else {
                        layer.alert(data.data);
                    }
                    if (data.data && data.data && data.data.indexOf("{") >= 0 && data.data.indexOf("}") > 0) {
                        kmeans_current_submissionid = JSON.parse(data.data).KMEANS_CURRENT_SUBMISSIONID;
                    }
                } else {
                    layer.alert('提交失败');
                }
            });
        });
        //监听指定开关
        form.on('switch(recommend_local_model_input)', function (data) {
            $('#recommend_local_model').attr('value', this.checked);
        });
    });
}

function collapse_step4_init() {
    layui.use(['element', 'layer'], function () {
        var element = layui.element;
        var layer = layui.layer;
        //监听折叠
        element.on('collapse(recommend_model_collapse)', function (data) {
            // layer.msg('展开状态：' + data.show);
        });
    });
}

function reload_step4_ui(is_reload) {
    if (is_reload) {
        saf_layui.loding_increase('preview_step4_kmeans', 1);
    } else {
        saf_layui.loding_increase('preview_step4_kmeans', 0);
    }
}

function connect_step4() {
    var socket = new SockJS(monitor_path + '/endpointWisely'); //1连接SockJS的endpoint是“endpointWisely”，与后台代码中注册的endpoint要一样。
    stompClient = Stomp.over(socket);//2创建STOMP协议的webSocket客户端。
    stompClient.connect({}, function (frame) {//3连接webSocket的服务端。
        reload_step4_ui(true);
        console.log('开始进行连接Connected: ' + frame);
        //4通过stompClient.subscribe（）订阅服务器的目标是'/topic/getResponse'发送过来的地址，与@SendTo中的地址对应。
        stompClient.subscribe('/topic/getResponse', function (respnose) {
            showResponse_step4(JSON.parse(respnose.body));
        });
    });
}

function disconnect_step4(is_reload) {
    if (stompClient != null) {
        stompClient.disconnect();
    }
    if (is_reload) {
        reload_step4_ui(false);
    }
    console.log("Disconnected");
}

function showResponse_step4(message) {
    if (message.responseMessageType == 'progress') {
        saf_layui.loding_increase('preview_step4_kmeans', message.responseMessage);
    } else if (message.responseMessageType == 'console'
        && message.responseMessageId.indexOf('variance') >= 0) {
        if (message.responseMessageFormat == 'json') {
            var json = JSON.parse(message.responseMessage);
            if (!background_colors) {
                background_colors = saf_color.random($('#kmeans_best_k').val());
            }

            var msg = '<tr style="{0}"><td>{1}</td><td>{2}</td></tr>';
            if (json.type && json.data) {
                var data = json.data;
                var style = 'color: ' + background_colors[data.group] + ';';
                if (json.type == 2) {
                    $('#recommend_model_tbody').append(msg.format(style, data.group, data.data));
                } else if (json.type == 3) {
                    $('#recommend_test_model_tbody').append(msg.format(style, data.group, data.data));
                }
            }
        } else if (message.responseMessageFormat == 'string') {
            $('#spark_recommend_run_status').html(message.responseMessage);
        }
        if (message == '100') {
            disconnect_step4(false);
        }
    }
}