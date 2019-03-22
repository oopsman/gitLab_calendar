# gitLab_calendar
gitLab的提交墙前端库
用D3实现

### 用户提交墙接口返回格式
1、/:user/calendar.json
```
{
    "2018-11-21": 1,
    "2018-08-31": 6,
    "2018-09-04": 1,
    "2018-11-19": 1,
    "2018-09-01": 1,
    "2018-11-10": 1,
    "2018-08-18": 1,
    "2018-11-14": 4,
    "2018-11-24": 2,
    "2018-11-03": 1
}
```
### 点击某天获取提交信息接口格式
```
<h4 class="prepend-top-20">
Contributions for
<strong>Dec 5, 2018</strong>
</h4>
<ul class="bordered-list">
<li>
<span class="light">
<i class="fa fa-clock-o"></i>
1:37pm
</span>
pushed new branch
<strong>
<a href="/fanglib/f-node-db/commits/dev">dev</a>
</strong>
at
<strong>
<a title="f-node-db" href="/fanglib/f-node-db"><span class="namespace-name">fanglib / </span><span class="project-name">f-node-db</span></a>
</strong>
</li>
</ul>
```
