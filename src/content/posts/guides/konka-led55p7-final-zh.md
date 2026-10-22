---
title: 康佳 LED55P7 实战：ADB 去开机广告、清理桌面广告，并用 TVBox 打造简洁电视
published: 2026-09-24
description: 在 KONKA LED55P7 实机上用 ADB 把开机商业广告换成原厂开机片、清掉桌面/悬浮/屏保广告，并记录它的三层自愈机制与最终直接用 TVBox 观看的完整过程。
tags:
  - 指南
lang: zh
abbrlink: konka-led55p7
---

> 本文基于 **KONKA LED55P7 实机操作**整理，文中的系统版本、硬件参数、广告组件、文件路径和命令结果均以本机实际测试为依据。
> 
> **本文最终目标不是把康佳系统全部删除，而是：**
> 
> **开机跳过商业广告 → 进入桌面不再被广告打扰 → 直接打开 TVBox → 搜索资源并观看。**

---

## 一、先看最终效果

这次最终采用的方案其实比最开始设想的简单得多：

```text
电视开机
   ↓
原来的商业开机广告被替换
   ↓
进入康佳桌面
   ↓
桌面广告/悬浮广告/屏保广告被处理
   ↓
直接打开 TVBox
   ↓
搜索资源
   ↓
播放观看
```

本次最终实际达到的核心效果：

- 开机商业广告被替换为原厂开机片

- 桌面广告、悬浮/角标、屏保/待机广告得到处理

- TVBox 可以正常安装和运行

- 实际使用 TVBox 搜索和观看视频时没有出现额外广告干扰

- 没有刷机

- 没有删除系统 APK

- 没有更换原厂 Launcher

- 投屏相关组件没有被关闭

- 最终没有为了“彻底清空广告链”继续修改更多系统组件

**做到这里，就停止了。**

这也是本文最终采用的思路：

> **不要为了“看起来更干净”而继续修改已经不影响实际使用的系统部分。**

---

## 二、为什么不把康佳所有广告 APK 全部删掉？

最开始可能会很容易产生一种想法：

```text
发现一个广告 APK
↓
删掉

再发现一个
↓
再删掉

直到全部删光
```

实际操作后发现，这种做法并不适合这台电视。

因为康佳的广告并不是一个 APK 独立完成的，而是一整条链路：

```text
广告服务器
    ↓
广告素材下载
    ↓
广告程序
    ↓
桌面/屏保/待机/悬浮窗口
```

而且系统本身还有自动更新、自启动和 Provider 依赖。

所以：

> **广告已经不影响使用以后，就没有必要继续为了“少几个 APK”去冒险。**

本次实机最终选择的是：

```text
解决真正影响观看的问题
        ↓
安装自己需要的播放器
        ↓
绕开康佳自己的内容入口
        ↓
达到目标后停止修改
```

而不是追求：

```text
康佳系统一个广告程序都不剩
```

---

## 三、当贝市场：可选，不是必装

这一点需要特别说明。

### 当贝市场是什么？

简单来说：

> **当贝市场就是电视应用商店。**

它适合：

```text
想经常安装各种电视 APK
        ↓
希望直接在电视上搜索应用
        ↓
不想每次都通过电脑 ADB 安装
```

如果你的需求只是：

```text
搜索资源
↓
看视频
```

那么当贝市场**完全不是必需品**。

本次实际使用中，我最终**没有安装当贝市场**。

所以本文把它定义为：

```text
当贝市场：可选
```

以后需要安装其他电视应用的时候，再通过 ADB 装上也可以。

---

## 四、我的电视到底是什么配置？

虽然机器外壳写的是：

```text
KONKA LED55P7
```

但 Android 系统实际报告的是：

```text
Konka Android TV 9632
KKMT9632
```

实机检测结果：

```text
型号：KONKA LED55P7
平台：MediaTek MT9632
ro.hardware：m7332
CPU：4 核 ARMv7
Android：9 / API 28
RAM：894,288 kB，约 872 MiB
eMMC：8 GB
ABI：armeabi-v7a, armeabi
ABI64：为空
```

也就是说：

> **这是一台纯 32 位 ARM Android TV。**

这一点对安装 TVBox 非常重要。

---

## 五、为什么网上康佳教程不能直接照抄？

因为不同康佳电视：

```text
不同主板
不同 SoC
不同 Android 版本
不同固件
不同权限
不同广告组件
```

可能完全不同。

例如这台 LED55P7 实测存在：

```text
su
SELinux Permissive
没有 dm-verity
userdebug 固件
```

因此它能够做的一些事情，普通零售康佳电视未必能做。

但这里一定要记住：

> **权限高 ≠ 什么都应该删。**

本文最后没有采用刷机、删 `/system`、改系统分区等方式，就是因为“能做到”和“值得做到”是两回事。

---

## 六、第一步：开启 ADB

这台康佳电视可以通过工程菜单开启 ADB。

实际操作：

```text
遥控器
↓
依次输入 2008
↓
进入工程菜单
↓
开启 ADB 调试
↓
查看电视 IP
```

例如（示例地址，请替换为电视实际 IP）：

```text
192.168.1.100
```

---

## 七、电脑端准备 ADB

Windows 电脑准备：

```text
adb.exe
AdbWinApi.dll
```

本次实机使用：

```text
ADB 1.0.41
```

如果 ADB 没加入系统 PATH，可以直接进入 `adb.exe` 所在目录。

例如 PowerShell：

```powershell
cd "你的 adb.exe 所在目录"
```

然后：

```powershell
.\adb.exe devices
```

---

## 八、连接电视

示例使用的是：

```text
192.168.1.100:5555
```

连接：

```powershell
.\adb.exe connect 192.168.1.100:5555
```

再：

```powershell
.\adb.exe devices
```

正常应该看到：

```text
192.168.1.100:5555    device
```

注意：

> **5555 是这台电视实际使用的端口，不代表所有 Android TV 都固定使用 5555。**

如果自己的电视连接不上，不要直接假设是 ADB 坏了，需要先确认电视实际开放的 ADB 端口。

---

## 九、正式修改之前：先做只读体检

这一部分非常重要。

不要一上来执行：

```text
pm disable-user
```

更不要：

```text
pm uninstall
```

先查看：

### Android 版本

```bash
adb shell getprop ro.build.version.release
```

### 固件

```bash
adb shell getprop ro.build.display.id
```

### 主板

```bash
adb shell getprop ro.product.board
```

### 硬件

```bash
adb shell getprop ro.hardware
```

### CPU ABI

```bash
adb shell getprop ro.product.cpu.abilist
adb shell getprop ro.product.cpu.abilist64
```

### Root

这台电视的 `su` 不是 Magisk 常见语法，而是：

```bash
adb shell "su 0 id"
```

正常：

```text
uid=0(root)
```

不要写：

```bash
adb shell "su -c id"
```

本机实测这种写法会报：

```text
su: invalid uid/gid '-c'
```

正确语法是：

```text
su [UID] [命令]
```

例如：

```bash
adb shell "su 0 id"
adb shell "su 0 sh -c '命令'"
```

---

## 十、检查 SELinux 和 dm-verity

SELinux：

```bash
adb shell getenforce
```

本机：

```text
Permissive
```

检查 dm-verity：

```bash
adb shell "ls /dev/dm-*"
```

以及：

```bash
adb shell "cat /proc/cmdline" | grep -o "androidboot.verifiedbootstate=[a-z]*"
```

本机没有发现 dm-verity 正常工作的迹象，bootloader 状态为：

```text
orange
```

但是这里不要误解：

> **没有发现 dm-verity，并不代表修改系统分区就是安全的。**

它只是说明少了一层完整性校验机制。

---

## 十一、先找出康佳广告链路

执行：

```bash
adb shell pm list packages | grep konka
```

Windows PowerShell 也可以：

```powershell
adb shell pm list packages | findstr /i "konka"
```

实际梳理后，主要的广告相关组件包括：

```text
com.konka.systemadvert
com.konka.adverttool
com.konka.sticker
com.konka.downloadcenter
com.konka.vadr
com.konka.message
com.konka.appupgrade
```

大致可以理解成：

```text
systemadvert
↓
负责广告显示

downloadcenter
↓
下载广告素材

vadr
↓
设备/数据上报

message
↓
推送消息

appupgrade
↓
后台更新
```

---

## 十二、最关键的发现：开机广告不是普通 APK

这是整个实验里最值得记录的一点。

很多人会以为：

```text
com.konka.systemadvert
```

就是全部广告。

但实际上这台电视的开机广告是由：

```text
/system/bin/bootvideo
```

这个原生服务播放的。

它读取：

```text
/data/misc/konka/AdBoot/AdBootMedia/bootvideo.mp4
```

因此：

> **禁用 `com.konka.systemadvert`，并不能直接让开机 MP4 消失。**

它解决的是：

```text
屏保
悬浮窗
待机广告
待机唤醒广告
角标
```

而开机广告视频本身需要单独处理。

这也是很多网上“禁用某个康佳广告 APK 就完事”的教程，在这台电视上并不成立的原因。

---

## 十三、第一批广告组件：优先使用 disable

本次第一批处理：

```bash
adb shell pm disable-user --user 0 com.konka.adverttool
adb shell pm disable-user --user 0 com.konka.sticker
adb shell pm disable-user --user 0 com.konka.fourkshow
adb shell pm disable-user --user 0 fusion.android.tv.demo
```

这里故意使用：

```text
disable-user
```

而不是：

```text
uninstall
```

原因很简单：

```text
disable
↓
关闭
↓
以后可以 enable 恢复
```

而：

```text
uninstall
↓
改变系统状态
↓
恢复更加麻烦
```

对于老电视这种实验性改造：

> **可逆性比“删得干净”重要。**

---

## 十四、广告总闸：systemadvert

然后处理真正的核心广告程序：

```bash
adb shell pm disable-user --user 0 com.konka.systemadvert
```

检查：

```bash
adb shell pm list packages -d
```

以及：

```bash
adb shell dumpsys package com.konka.systemadvert | grep enabled
```

Windows：

```powershell
adb shell dumpsys package com.konka.systemadvert | findstr /i "enabled"
```

本机实测：

```text
enabled=3
```

也就是：

```text
COMPONENT_ENABLED_STATE_DISABLED_USER
```

注意：

```text
enabled=3
```

只能说明用户级禁用状态，不能单独作为“整个服务彻底没有运行”的证明。

最终需要结合：

```text
实际进程
实际广播
实际功能
重新启动后的状态
```

一起判断。

---

## 十五、开机广告第一次尝试：chmod，失败

最初的想法很简单：

```text
让广告程序不能写广告 MP4
```

于是尝试：

```bash
chmod 0555 /data/misc/konka/AdBoot/AdBootMedia
```

但是重启后：

```text
0555
↓
恢复成 0777
```

广告 MP4 又被系统换成了新的广告素材。

后来定位到了具体原因：

```text
/vendor/etc/init/hw/init.m7332.rc
```

里面有：

```text
mkdir /data/misc/konka                          0777 system system
mkdir /data/misc/konka/AdBoot                   0777 system system
mkdir /data/misc/konka/AdBoot/AdBootAnimation   0777 system system
mkdir /data/misc/konka/AdBoot/KonkaAdBootAnimation 0777 system system
mkdir /data/misc/konka/AdBoot/AdBootMedia       0777 system system
```

Android `init` 每次开机都会执行这些初始化操作。

因此：

```text
chmod 0555
↓
重启
↓
init
↓
恢复 0777
↓
广告程序重新写文件
```

得到的结论是：

> **单纯靠目录 chmod 防止广告回写，这台电视上是经不起一次重启的。**

---

## 十六、最终有效方案：锁住广告文件本身

既然目录权限会被重新设置，那么就不锁目录，直接锁文件。

本机发现原厂无广告开机视频位于：

```text
/kkpanel/link/bootmedia/bootvideo.mp4
```

本机文件大小：

```text
3,475,603 B
```

将它复制到广告 MP4 的位置：

```bash
adb shell "su 0 sh -c 'cp -f /kkpanel/link/bootmedia/bootvideo.mp4 /data/misc/konka/AdBoot/AdBootMedia/bootvideo.mp4
chown system:system /data/misc/konka/AdBoot/AdBootMedia/bootvideo.mp4
chmod 0444 /data/misc/konka/AdBoot/AdBootMedia/bootvideo.mp4'"
```

然后：

```bash
adb shell "su 0 toybox chattr +i /data/misc/konka/AdBoot/AdBootMedia/bootvideo.mp4"
```

检查：

```bash
adb shell "su 0 toybox lsattr /data/misc/konka/AdBoot/AdBootMedia/bootvideo.mp4"
```

正常：

```text
----i--------
```

这里的：

```text
i
```

就是 immutable。

意思可以简单理解为：

> **即使程序重新拿到写权限，也不能直接修改这个文件。**

---

## 十七、为什么 `chattr +i` 必须这样验证？

如果用：

```bash
su 0
```

测试文件写保护，没有意义。

因为：

```text
root
```

本来就拥有最高权限。

所以真正有意义的测试是模拟广告程序身份，例如：

```bash
adb shell "su 1000 sh -c 'echo x > /data/misc/konka/AdBoot/AdBootMedia/bootvideo.mp4'"
```

本机测试结果为：

```text
Operation not permitted
```

这才说明普通系统身份确实无法改。

而且文件本身使用 immutable 后：

```text
root
↓
也不能直接 rm
```

必须先：

```bash
chattr -i
```

才能恢复修改。

---

## 十八、千万不要给 AdBootAnimation 目录乱放占位文件

本机：

```text
AdBootAnimation/
```

目前是空的。

不要为了“保险”随便塞一个假的：

```text
bootanimation.zip
```

因为：

> 如果系统以后真的切换到这个路径播放，而里面是损坏的占位文件，反而可能把开机动画搞坏。

所以：

> **空目录就保持空目录。**

---

## 十九、必须做真实冷启动验证

这是整个方法里很重要的一步。

不能只看：

```text
lsattr
```

也不能只看：

```text
enabled=3
```

真正验证：

```text
冷启动
↓
Android 完整启动
↓
重新读取 bootvideo
↓
看 immutable 是否还存在
↓
看 MD5 是否改变
```

本机真实冷启动后：

```text
lsattr
----i--------
```

并且：

```text
MD5
```

仍然保持原厂片的 MD5：

```text
c27ed929a2f9ca8d0053f73cb69d34d7
```

说明：

> **本机当前固件下，这套开机广告替换 + immutable 防回写方案已经通过真实冷启动验证。**

注意这里的表述是：

> **本机实测有效。**

不要扩展成：

> 所有康佳电视都适用。

不同型号必须重新检测。

---

## 二十、一个非常容易踩的坑：遥控器“关机”不一定是真关机

这台电视存在：

```text
com.konka.quickstandby
```

它使用 STR 快速待机机制。

也就是说：

```text
按遥控器关机
↓
不一定真正关闭 Android
↓
可能进入假待机
```

这种情况下：

```text
uptime
```

可能不会归零。

因此测试开机广告时，不要把普通待机唤醒当成真正冷启动。

可以通过：

```bash
adb shell getprop ro.boot.bootreason
```

以及：

```bash
adb shell cat /proc/uptime
```

辅助判断。

本机真正的冷启动测试，必须确保 Android 实际重新启动。

---

## 二十一、最重要的三层“自愈机制”

这次实验最大的价值之一，就是发现康佳电视并不是“你禁掉了它，它就永远没了”。

### 第一层：应用自动更新

`com.konka.appupgrade` 会进行后台应用更新。

如果某个系统 APK 被重新安装：

```text
原来的 disable 状态
↓
重新安装
↓
恢复默认启用
```

因此：

> **先断更新链，再禁广告包**，是继续做深度精简时更合理的顺序。

但本文最终没有继续做这一步，因为到 TVBox 正常使用以后，实际目标已经达成。

---

### 第二层：init.rc 重置目录权限

这就是之前：

```text
chmod 0555
```

重启失效的原因。

所以：

> **依赖目录权限的广告防回写方案，不适合这台电视。**

最终采用的是锁文件本身。

---

### 第三层：PERSISTENT 进程

有一些系统应用带：

```text
PERSISTENT
```

即使禁用，进程也可能仍存在。

因此：

```text
enabled=3
```

不等于：

```text
进程一定不存在
```

本机 `fourkshow` 就曾经出现过这种情况。

所以对于这种程序：

> 最终应该看实际进程、PSS、广播和功能，而不是只看一个状态值。

---

## 二十二、为什么不要随便禁 appupgrade？

这一点对于以后继续折腾电视的人尤其重要。

本机审计发现：

```text
com.konka.appupgrade
```

暴露了 Provider。

而：

```text
com.konka.livelauncher
com.konka.tvsettings
com.konka.market.main
```

等组件会访问这些 Provider。

因此：

```text
直接整包禁用 appupgrade
```

有可能产生：

```text
桌面查询异常
设置查询异常
应用商店异常
```

更安全的办法，是未来真的要处理它时，先进行 Provider 依赖审计，再考虑只关闭：

```text
BootCompleteReceiver
AlarmReceiver
AppUpgradeService
```

也就是说：

> **系统 APK 在禁用之前，一定先查 Provider 和组件依赖。**

不要看到名字像“更新”，就直接整包砍掉。

---

## 二十三、为什么没有把系统 APK 全部删除？

因为：

```text
能删
≠
值得删
```

例如：

```text
com.konka.tvsettings
```

负责系统设置。

```text
com.android.packageinstaller
```

负责安装 APK。

```text
com.konka.mirror
```

负责手机镜像。

```text
com.konka.kkmultiscreen
```

负责多屏互动。

```text
com.konka.livelauncher
```

是当前系统桌面。

这些东西虽然不一定与你“看视频”直接相关，但删除以后可能造成：

```text
设置进不去
投屏失效
APK 装不上
没有桌面
电视功能异常
```

所以最终采取：

> **只处理明确对应广告、并且经过验证可以处理的组件。**

---

## 二十四、为什么最终直接使用 TVBox？

这才是本次改造真正的“终点”。

我的实际需求并不是：

```text
安装很多电视应用
```

而是：

```text
搜索资源
↓
看视频
```

所以只需要：

```text
TVBox
```

作为主要入口。

整个使用方式变成：

```text
康佳原厂系统
       ↓
负责底层电视功能
       ↓
TVBox
       ↓
搜索资源
       ↓
观看视频
```

而不是：

```text
康佳首页
↓
康佳推荐
↓
康佳内容平台
↓
广告
↓
广告
↓
广告
```

最终实际使用 TVBox 时没有出现额外广告干扰，因此后续广告链没有再继续处理。

---

## 二十五、TVBox 安装前一定检查 ABI

这台电视是：

```text
armeabi-v7a
armeabi
```

同时：

```text
ro.product.cpu.abilist64
```

为空。

所以这是：

> **纯 32 位 Android TV。**

TVBoxOSC 一个 Release 可能同时提供：

```text
java
java32
java64
python
python32
python64
```

对于这台机器：

```text
java32
```

最合适。

不要随便安装：

```text
arm64-v8a
```

版本。

---

## 二十六、为什么 APK 不能“下载下来能打开就算合法”？

这是另一个实际踩过的坑。

某个 APK 即使：

```text
文件名是 .apk
file 命令说 Android package
```

也不能证明：

```text
文件完整
```

下载过程中如果文件被截断：

```text
file
```

仍然可能把它识别成 APK。

更可靠的方法是：

### 1. 获取官方 Release 的 SHA-256

例如从 GitHub Release API 获取：

```text
digest
```

### 2. 本地计算

```bash
sha256sum TVBox.apk
```

### 3. 对比

必须：

```text
完全一致
```

再安装。

---

## 二十七、TVBox 安装流程

先确认 APK：

```text
TVBox_..._java32.apk
```

再：

```bash
adb install -r TVBox.apk
```

成功：

```text
Success
```

查真实包名：

```bash
adb shell pm list packages | grep -i tvbox
```

不要自己猜包名。

例如本机实际包名可能是：

```text
com.github.tvbox.osc.jun
```

然后：

```bash
adb shell monkey -p com.github.tvbox.osc.jun 1
```

实际使用时必须以你自己电视查询出来的真实包名为准。

---

## 二十八、为什么不在教程里提供影视接口？

TVBox 本身只是：

```text
播放器 / 聚合框架
```

真正决定里面显示什么内容的是：

```text
配置地址 / 内容源
```

所以本文不提供来历不明的影视接口，也不推荐从陌生网站下载配置。

使用时：

```text
TVBox
↓
设置
↓
配置地址
↓
填写你自己选择并确认可以使用的内容源
```

这样可以把：

```text
软件本身
```

和：

```text
内容来源
```

分开。

另外：

> **“TVBox 没有广告”不等于“所有内容源的视频流永远没有广告”。**

本次实机使用的配置在实际观看过程中没有出现额外广告，因此本文将其作为**本机实测结果**记录，而不是对所有内容源作绝对保证。

---

## 二十九、内存只有约 872 MiB，这是为什么要尽量简单？

这台电视实际总内存：

```text
894,288 kB
```

约：

```text
872 MiB
```

Android 开机后本身就已经占用了相当一部分。

而且系统判断：

```text
status critical
```

因此：

> **这台电视并不适合安装一大堆常驻后台的电视 App。**

这也是为什么这次方案选择：

```text
原厂底层
+
一个主要播放器
```

而不是：

```text
十几个电视应用同时安装
```

---

## 三十、不要直接把 RSS 相加算内存

这是另一个很容易误判的问题。

例如：

```bash
ps -A -o RSS,NAME
```

看到很多进程以后，直接全部相加，会得到一个非常夸张的数字。

原因是共享内存会被多个进程重复计算。

本机同一时间：

```text
RSS 合计约 1,647 MB
```

但电视总 RAM 只有：

```text
约 872 MB
```

显然不可能真的用了 1.6GB 独占内存。

所以真正分析内存，建议看：

```bash
adb shell dumpsys meminfo
```

重点关注：

```text
PSS
```

而不是把所有 RSS 简单相加。

---

## 三十一、一个重要经验：一次只改一个变量

本次最初的第一轮实验其实同时做了：

```text
替换开机视频
+
chmod
+
禁用多个广告包
```

结果出现问题以后，需要重新回头定位：

```text
到底是哪一步失效
```

这很浪费时间。

因此以后再改这种老设备：

```text
只改一项
↓
验证
↓
需要重启时人工重启
↓
验证
↓
再改下一项
```

会可靠得多。

---

## 三十二、以后不要让 Agent 自动重启电视

这个必须单独写进教程。

不要在 Agent 指令里允许：

```text
adb reboot
```

或者：

```text
adb shell reboot
```

或者：

```text
adb shell su 0 reboot
```

原因很简单：

这台电视真正冷启动之后：

```text
Wi-Fi
↓
ADB
↓
5555
```

可能需要接近：

```text
110 秒
```

才完全恢复。

中途可能出现：

```text
offline
ping 不通
5555 关闭
```

这并不一定代表电视坏了。

而且：

> **开机广告到底有没有被解决，只有人在电视屏幕前才能真正确认。**

因此最合理的模式是：

```text
Agent
↓
执行修改
↓
发现需要重启
↓
告诉你
↓
停止
↓
你自己决定是否重启
```

---

## 三十三、什么时候才需要继续深度清理？

只有当你发现：

```text
还有康佳广告
```

或者：

```text
后台一直自动安装东西
```

或者：

```text
内存已经影响 TVBox 使用
```

才有必要继续分析：

```text
downloadcenter
vadr
message
appupgrade
market
PERSISTENT 服务
```

而不是单纯为了“系统看起来更干净”继续删除。

本次最终没有继续处理这些后续链路，就是因为：

> **TVBox 已经绕过了康佳的主要内容入口，而且实际观看已经达到了预期效果。**

---

## 三十四、完整回退思路

如果以后想恢复广告相关组件，可以：

```bash
adb shell pm enable com.konka.systemadvert
adb shell pm enable com.konka.adverttool
adb shell pm enable com.konka.sticker
adb shell pm enable com.konka.fourkshow
adb shell pm enable fusion.android.tv.demo
```

如果要恢复开机广告文件：

首先解除 immutable：

```bash
adb shell "su 0 toybox chattr -i /data/misc/konka/AdBoot/AdBootMedia/bootvideo.mp4"
```

然后恢复备份：

```bash
adb shell "su 0 sh -c 'cp -f /data/local/konka_ad_backup/ad_current.mp4 /data/misc/konka/AdBoot/AdBootMedia/bootvideo.mp4'"
```

注意：

> **必须先 `chattr -i`，再执行 `cp` 或 `rm`。**

否则 immutable 文件连 root 都无法正常覆盖。

---

## 三十五、本文最终采用的实际方案

最终没有走：

```text
刷第三方 ROM
↓
替换 Launcher
↓
删除系统 APK
↓
修改 /system
↓
修改 /vendor
```

而是：

```text
① 开启 ADB
      ↓
② 只读检测电视
      ↓
③ 找出康佳广告链
      ↓
④ 禁用低风险广告组件
      ↓
⑤ 禁用 systemadvert
      ↓
⑥ 找到真实开机广告 MP4
      ↓
⑦ 使用原厂开机片覆盖
      ↓
⑧ chattr +i 锁住文件
      ↓
⑨ 做真实冷启动验证
      ↓
⑩ 安装 TVBox
      ↓
⑪ 实际使用 TVBox 搜索/播放
      ↓
⑫ 达到目标
      ↓
⑬ 停止继续修改
```

---

## 三十六、最终状态

以本次实际操作结束时的状态为准：

```text
✅ 开机商业广告
   → 已替换为原厂开机片
   → 使用 chattr +i 锁定
   → 已通过真实冷启动验证

✅ 桌面广告
   → 核心广告组件已处理
   → 桌面悬浮/角标/屏保/待机广告得到处理

✅ TVBox
   → 已安装
   → 可以正常启动
   → 可以搜索资源并观看
   → 本次实际使用没有出现额外广告

✅ 原厂桌面
   → 保留
   → 没有为了换桌面而冒额外风险

✅ 手机投屏
   → 相关 `mirror / kkmultiscreen` 组件没有关闭

✅ 系统底层
   → 没有刷机
   → 没有删除系统 APK
   → 没有修改 `/system`
   → 没有修改 `/vendor`
   → 没有修改 init.rc
   → 没有修改 build.prop

⭕ 当贝市场
   → 可选，不是必装
   → 本次实际没有安装

⏸ 后续广告链
   → 没有继续处理
   → 因为 TVBox 已经绕开康佳内容入口
   → 实际观看目标已经达到
```

---

## 三十七、最终复盘：这次真正值得记录的是什么？

这次改造最值得记录的，不是某一条 ADB 命令，而是几个实际踩出来的结论。

### 1. 康佳广告不是一个 APK

它是一条链：

```text
下载
↓
渲染
↓
推送
↓
更新
```

所以必须先查清楚谁负责什么。

### 2. 开机广告和桌面广告是两件事

开机广告实际上是：

```text
bootvideo
+
bootvideo.mp4
```

而不是单纯的：

```text
systemadvert
```

### 3. chmod 目录不可靠

因为：

```text
init.rc
```

会在开机重新建立目录并恢复权限。

### 4. immutable 文件锁是本机实测有效的办法

不是“网上说有效”。

而是：

```text
替换原厂片
↓
chattr +i
↓
真实冷启动
↓
MD5 不变
↓
实测通过
```

这才算真正验证。

### 5. enabled=3 不代表一切都结束

还要看：

```text
进程
广播
PSS
功能
重启后的状态
```

### 6. 不要为了彻底而彻底

这次最大的经验其实是：

> **当电视已经没有明显广告，并且 TVBox 已经满足观看需求时，就没有必要再继续修改更多系统组件。**

---

## 三十八、最终结果，用一句话概括

这次不是把康佳电视“魔改成另一个系统”，而是：

> **保留原厂系统负责电视本身的功能，关闭真正影响体验的广告，把观看视频的入口交给 TVBox。**

最终变成：

```text
开机
 ↓
没有商业开机广告
 ↓
进入桌面
 ↓
没有明显广告干扰
 ↓
打开 TVBox
 ↓
搜索资源
 ↓
直接观看
```

这就是这台 **KONKA LED55P7** 本次实机改造最终采用的方案。
