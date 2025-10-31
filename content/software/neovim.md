+++
date = '2025-10-03T06:11:12Z'
draft = false
title = 'Neovim'
+++

来来回回卸载以后发现我可能真的不适合它。

## Modal Editing

这是我最后决定卸载的理由，所以排第一了。Modal Editing 并不适合我。首先输入法的 IME 本质上是一种 toggle，这种 toggle 是在不同的 layer 之中。Modal Editing 说白了也是用一种 layer。这种交织会把我搞乱，以至于我从来没有成功进入心流状态中。更别说我的 ZMK 也有 layer 了。想象一下在 Neovim 编辑需要考虑什么：先要考虑键盘 toggle 状态，再考虑中英文状态、再考虑是否进入 Insert 模式。虽然这对许多用户来说不是问题，但是对我来说负担太大了。

中文支持、无法重复（repetition）或没有正反馈这些问题，由于没有具体的真实代码示例，我决定省略它们。

## Leader Key

Leader Key 对我来说是启发性的。

在接触 Neovim 之前，我从来没有想过能这么操作文本（或者不是文本）的东西。QMK 和 ZMK 都已经是之后的事情了，是我搜索了才发现它们有自己的 Leader Key 实现。

运用 Leader Key 可以根据语义编写快捷键。一般来说，Leader Key 后面跟着的是两个，少有三个，而且实践中都是 `<leader><major scope><minor scope>`。我（Gemini 2.5）写了一个 Leader Key（`F24`）的 AHK 脚本，非常舒服。

顺带一提，QMK 把它定义为修饰键的一种。这是比较有意思的。在我看来所有行为都分为三种，第一种是非常常用的，比如 undo。第二种是不常用的，偶尔想起来用一下，比如 Photoshop 一些没人用的古老滤镜。而在这之间是第三种常用但是不够第一种常用的，比如说 split window、关闭倒数第四个窗口之类。这第三种就要用到 Leader Key。

Leader Key 让我认为不能用一种方案来解决所有事情（one-shot mod），而要根据不同事情决定最优方案。我们一定要有保底的方案，这其中除了 GUI 和 TUI 以外，对于键盘操作上我特别赞成 omni-，一种例子就是 omnibar。没有 omnibar 我们完全无法得到快速操作第二种不常用的快捷方式，我觉得这不是一种关乎极简的设计（当然极简也不错），它只是碰巧极简了。现代软件有许多 omnibar，比如 VSCode 的 Command Palette，Obsidian 也有一个，甚至 Windows 的 explorer.exe 也是（它可以输入 SFTP 和 FTP 地址，而非总是文件夹路径）。

omnibar 并不是完美的，它很大程度上要依靠设计者的描述水平。虽然我们可以设计标题+描述，这样用户就能更轻易地搜到了。然而现实情况是用户可能想的就和我们不一样，比如 buffer 和 tab。这种交接处总是有许多的。我觉得这种情况更加好的方式也许是加一个 tag 系统，就比如说 buffer 和 tab 可以标注为 #UI，或者甚至是 #square，然后在用户输入的时候加上 # 就行了。大家或许没有这么做的原因应该是不知道要 #tag 什么，这么做要维护一个 tag 云，当然这样很可能并不会让 omnibar 变得更好。

Leader Key 也不完美，和 omnibar 一样它也有定义问题。只不过，相对于 omnibar 这种无限制的语义范围引发的问题，Leader Key 就好多了：我只要维护一个 major scope，确定好 scope 的语义，用户必须要按照我的这个语义走就行，或者用户甚至可以自己写 AHK 脚本不按照我的这个语义走。当然这些都是对一些封闭软件引入 Leader Key 的不切实际的幻想，因为如果这么理解，one-shot mod 也逐渐变得合理起来了。我们现在要做的其实是用 AHK 编写自己的语义，来定义自己的软件行为。

讲了那么多，总之 Leader Key 对我的帮助很大。

### Homerow

Homerow 对我来说是启发性的。

在 Neovim 里，HJKL 就是 homerow 的一种代表。它给了我一种语义的启发，而非它们的设置本身。在设置上，我更偏好语义快捷键（C-b、C-p、C-n、C-f），而非位置。不过，无论是真正的 Vim 还是哪些软件上 Vim 的模拟器，都几乎会支持这 4 个键。