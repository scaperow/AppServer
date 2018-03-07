var app = angular.module('app', []);

app.controller('LineListCtrl', ['$scope', '$http',
    function ($scope, $http) {
        $http({method: 'GET', url: '/line/lines'})
            .success(function (data) {
                if (data.error) {
                    return alert(data.error);
                }

                $scope.lines = data;
                $scope.switch(data[0].id);
            })
            .error(function (data) {
                return alert('error');
            });

        $scope.switch = function (id) {
            $scope.current_line_id = id;
            $http({method: 'GET', url: '/testRoom/userlist/' + id})
                .success(function (data) {
                    if (data.error) {
                        return alert(data.error);
                    }

                    $scope.users = data;
                })
                .error(function (data) {
                });
        }

        $scope.edit = function (id) {
            var result = _.where($scope.users, {id: id});
            if (result && result.length > 0) {
                $scope.current_user = result[0];
            }
        }

        $scope.save = function () {
            $scope.processing = true;
            $http({method: 'POST', url: '/testRoom/modifyuser', data: {user: $scope.current_user}})
                .success(function (data) {
                    $scope.processing = false;

                    if (data.error) {
                        return alert(data.error);
                    }
                })
                .error(function (data) {
                    $scope.processing = false;

                    return alert('error');
                });
        }
    }]);

//app.controller('UserListCtrl', ['$scope', '$http',
//    function ($scope, $http) {
//        $scope.users = $(http)
//    }]);