# 长安有雨

从西安开始的非商业天气网页：真实地图建筑、当前天气、24小时和七日预报、雨雪氛围、系统语音和本机录音提醒。

发布：在本仓库 Settings → Pages 中选择 Deploy from a branch，选择 main 分支和 /(root)，保存。无需构建或 API 密钥。

录音仅存于访客浏览器，不上传服务器。建筑高度部分为示意，天气来自模型数据，雨雪动画不代表逐栋建筑实测。

数据署名：Open-Meteo (CC BY 4.0)、OpenFreeMap / OpenMapTiles / OpenStreetMap。地图渲染使用 MapLibre GL JS 5.6.2，其许可证见 LICENSE.txt。

地图与天气需要联网，具体网络的可用性以实际访问为准。系统播报和录音取决于浏览器支持与用户权限。
