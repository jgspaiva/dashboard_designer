angular.module('biwebApp').

controller('PainelController', [ '$scope', '$mdDialog', '$mdMedia', '$mdSidenav', '$timeout', function($scope, $mdDialog, $mdMedia, $mdSidenav, $timeout){

    $scope.edicao = false;

    // Fontes de Dados
    $scope.fontes = [];

    $scope.fonte = {};

    var dataTable = null;
    $scope.filtros = [];
    $scope.graficos = [];
    $scope.charts = [];
    $scope.chartAtual = null;
    $scope.filters = [];
    $scope.dashboard = null;

    // Menu de Paineis
    $scope.openRightMenu = function(){
        $mdSidenav('right').toggle();
    };

    // Dashboard
    // Cria um novo dashboard em branco
    $scope.newDashboard = function(evento){
        $scope.edicao = true;

        $scope.dashboardAtivo = {
            graficos: [],
            controladores: [],
            fonte: {}
        };

        dataTable = null;
        $scope.filtros = [];
        $scope.graficos = [];
        $scope.charts = [];
        $scope.chartAtual = null;
        $scope.filters = [];
        $scope.dashboard = null;

        $scope.fonte = JSON.parse(sessionStorage.getItem('header'));

        dataTable = getDadosNovo(
            $scope.fonte,
            JSON.parse(sessionStorage.getItem('fonte'))
        );

        $scope.openRightMenu();
    };

    // Salva o dashboard ativo
    $scope.saveDashboard = function(){
        console.log('saveDashboard');

        $scope.edicao = false;

        geraDashboard(dataTable, $scope.charts, $scope.filters);
    };

    // Abre o dashboard
    $scope.openDashboard = function(){
        console.log('openDashboard')
    };

    // Remove Dashboard
    $scope.removeDashboard = function(dashboard){
        console.log('removeDashboard');
    };


    // Funções para Google Charts
    // 1 - Chart Editor
    var chartEditor = null;

    $scope.loadEditor = function (wrapper){
        chartEditor = new google.visualization.ChartEditor();
        google.visualization.events.addListener(chartEditor, 'ok', redrawChart);
        chartEditor.openDialog(wrapper, {});
    };

    // 1.1 - Redraw Chart
    function redrawChart(){
        var wrapper = chartEditor.getChartWrapper();
        var options = wrapper.getOptions();

        // Define o tamanho do gráfico externamente
        options["width"] = 400;
        options["height"] = 400;
        options["animation"] = { duration: 707 };

        wrapper.setOptions(options);

        $scope.charts[$scope.charts.indexOf($scope.chartAtual)] = wrapper;

        wrapper.draw(document.getElementById(wrapper.containerId));
    }

    // Funções de Gráficos
    function desenhaGrafico(grafico_, dados_, tagId_) {
        var grouped_dt = agrupa(dados_, grafico_);

        var wrapper = new google.visualization.ChartWrapper(
            {
                chartType: grafico_.chartType,
                dataTable: grouped_dt,
                options: {
                    'title': grafico_.titulo
                },
                containerId: 'vis_div_' + tagId_
            }
        );

        console.log('Com animation');

        wrapper.draw();

        return wrapper;
    }

    var getDadosNovo = function(header, dados){
        var saida = new google.visualization.DataTable();

        header.forEach(function(col){
            console.log('campo: ' + col.campo + ', tipo: ' + col.tipo);
            saida.addColumn(col.tipo.toLowerCase(), col.campo);
        });

        var rows = [];

        dados.forEach(function(dado){
            var row = [];

            header.forEach(function(col){
                if(String(dado[col.campo]).split('/').length == 3){
                    var data = String(dado[col.campo]).split('/');

                    row.push(new Date(data[2], data[1], data[0]));
                }
                else row.push(dado[col.campo]);
            });

            rows.push(row);
        });

        saida.addRows(rows);

        console.log('Number of rows: ' + saida.getNumberOfRows());
        console.log('Number of columns: ' + saida.getNumberOfColumns());

        return saida;
    };

    var geraDashboard = function(dataTable_, charts_, filters_){
        $scope.dashboard = new google.visualization.Dashboard(document.getElementById("dash_teste"));

        $scope.dashboard.bind(filters_, charts_);

        $scope.dashboard.draw(dataTable_);

        filters_.forEach(function(filter_, indFilter){
            charts_.forEach(function(chart_, indChart){
                google.visualization.events.addOneTimeListener(filter_, 'ready', function(event) {
                    chart_.setDataTable(agrupa(dataTable_, $scope.graficos[indChart]));

                    console.log(JSON.stringify(chart_.getOptions()));
                    console.log('URI = ' + chart_.getChart().getImageURI());

                    chart_.draw();
                });

                google.visualization.events.addListener(filter_, 'statechange', function(event) {
                    chart_.setDataTable(agrupa(chart_.getDataTable(), $scope.graficos[indChart]));

                    console.log('statechange');
                    console.log('URI = ' + chart_.getChart().getImageURI());

                    chart_.draw();
                });
            });
        });
    };

    var criaControlador = function(filtro_, tagId_){
        var tipo = 'CategoryFilter';

        console.log('Tipo do controlador ' + filtro_.campo + ' é ' + filtro_.tipo);

        if(filtro_.tipo.toLowerCase() == 'date'){
            tipo = 'DateRangeFilter';
        }
        else if(filtro_.tipo.toLowerCase() == 'number'){
            tipo = 'NumberRangeFilter';
        }
        else if(filtro_.tipo.toLowerCase() == 'string'){
            tipo = 'CategoryFilter';
        }

        console.log('ControlType: ' + tipo);

        var saida = new google.visualization.ControlWrapper({
            controlType: tipo,
            containerId: 'ctr_div_' + tagId_,
            options: {
                filterColumnLabel: filtro_.campo,
                filterColumnIndex: filtro_.index,
                ui: {
                    labelStacking: 'vertical'
                }
            }
        });

        return saida;
    };

    var agrupa = function(dataTable_, grafico_){
        var cols = [];
        var columns = [0];
        var i = 1;

        grafico_.dados.y.forEach(function(val){
            var aggreg = google.visualization.data.sum;

            if(val.totalizador == 'AVG') aggreg = google.visualization.data.avg;
            else if(val.totalizador == 'MAX') aggreg = google.visualization.data.max;
            else if(val.totalizador == 'MIN') aggreg = google.visualization.data.min;
            else if(val.totalizador == 'COUNT') aggreg = google.visualization.data.count;

            var reg = { 'column' : val.indice, 'aggregation' : aggreg, 'type' : val.tipo.toLowerCase() };

            cols.push(reg);

            columns.push(i);
            i++;
        });

        var grouped_dt = google.visualization.data.group(
                          dataTable_, [grafico_.dados.x.indice],
                          cols);

        return grouped_dt;
    };

    $scope.showDialogDados = function(evento, objeto) {
        var useFullScreen = $mdMedia('xs');

        $mdDialog.show({
            controller: DialogDadosController,
            templateUrl: 'templates/choose_dados_dialog.tmpl.html',
            parent: angular.element(document.body),
            targetEvent: evento,
            clickOutsideToClose: false,
            bindToController: true,
            locals: { fonte: $scope.fonte, componente: objeto },
            fullscreen: useFullScreen
        }).
        then(
            function(grafico) {
                if(grafico.editado) {
                    // Recebe os dados escolhidos
                    console.log('Dados atualizados');
                }
                else {
                    // Recebe grafico novo

                    var tagId = $scope.graficos.length;

                    $scope.graficos.push(grafico);

                    $timeout(function(){
                        var wrapper = desenhaGrafico(grafico, dataTable, tagId);

                        $scope.chartAtual = wrapper;
                        $scope.charts.push($scope.chartAtual);

                        $scope.loadEditor($scope.chartAtual);

                    }, 500);


                }
            },
            function() {
                // Cancelado
                console.log('Cancelado');
            }
        );
    };

    $scope.showDialogControlador = function(evento) {
        var useFullScreen = $mdMedia('xs');

        $mdDialog.show({
            controller: DialogFilterController,
            templateUrl: 'templates/add_filter_dialog.tmpl.html',
            parent: angular.element(document.body),
            targetEvent: evento,
            clickOutsideToClose: false,
            bindToController: true,
            locals: { fonte: $scope.fonte },
            fullscreen: useFullScreen
        }).
        then(
            function(filtro) {


                var tagId = $scope.filtros.length;

                $scope.filtros.push(filtro.campo);

                $timeout(function(){
                        var ctr = criaControlador(filtro, tagId);

                        $scope.filters.push(ctr);

                    }, 500);

            },
            function() {
                // Cancelado
                console.log('Cancelado');
            }
        );
    };

    // Configuração do CSV Importador

    $scope.csv = {
    	content: null,

    	header: true,
    	headerVisible: false,

    	separator: ',',
    	separatorVisible: false,

    	result: null,

    	encoding: 'ISO-8859-1',
    	encodingVisible: false
    };

    // Função para compartilhamento de historia
    $scope.share = function(){
        FB.api(
            'me/objects/begyn_dd:chart',
            'post',
            {
                'object': {
                    'og:url': 'http://samples.ogp.me/242496319476180',
                    'og:title': 'Sample Chart',
                    'og:type': 'begyn_dd:chart',
                    'og:image': 'https://fbstatic-a.akamaihd.net/images/devsite/attachment_blank.png',
                    'og:description': 'Massa esse programa',
                    'fb:app_id': '230447407347738'
                }
            },
            function(response) {
                console.log('Chegou resposta');
                console.log(JSON.stringify(response));
            });
    };
}]);
