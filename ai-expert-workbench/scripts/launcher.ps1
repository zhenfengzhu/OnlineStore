Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$launcherDir = Join-Path $projectRoot ".launcher"
$pidFile = Join-Path $launcherDir "next.pid"
$outLog = Join-Path $launcherDir "server.out.log"
$errLog = Join-Path $launcherDir "server.err.log"
$port = 3001
$url = "http://localhost:$port"

New-Item -ItemType Directory -Force -Path $launcherDir | Out-Null

function Get-ServerProcess {
  if (!(Test-Path $pidFile)) {
    return $null
  }

  $rawPid = (Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (!$rawPid) {
    return $null
  }

  $serverProcess = Get-Process -Id ([int]$rawPid) -ErrorAction SilentlyContinue
  return $serverProcess
}

function Test-PortOpen {
  $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  return [bool]$connection
}

function Set-Status {
  param([string]$Message)
  $statusLabel.Text = $Message
  $form.Refresh()
}

function Append-Log {
  param([string]$Message)
  $timestamp = Get-Date -Format "HH:mm:ss"
  $logBox.AppendText("[$timestamp] $Message`r`n")
}

function Run-Command {
  param(
    [string]$FilePath,
    [string]$Arguments
  )

  $process = Start-Process `
    -FilePath $FilePath `
    -ArgumentList $Arguments `
    -WorkingDirectory $projectRoot `
    -NoNewWindow `
    -Wait `
    -PassThru

  return $process.ExitCode
}

function Refresh-State {
  if (Test-PortOpen) {
    Set-Status "状态：项目正在运行，地址 $url"
    $startButton.Enabled = $false
    $stopButton.Enabled = $true
    $openButton.Enabled = $true
  } else {
    Set-Status "状态：未启动"
    $startButton.Enabled = $true
    $stopButton.Enabled = $false
    $openButton.Enabled = $true
  }
}

function Initialize-Database {
  try {
    Set-Status "状态：正在初始化数据库..."
    Append-Log "执行 npm run db:init"
    $exitCode = Run-Command "npm.cmd" "run db:init"
    if ($exitCode -eq 0) {
      Append-Log "数据库初始化完成。"
      Set-Status "状态：数据库已初始化"
    } else {
      Append-Log "数据库初始化失败，退出码：$exitCode"
      Set-Status "状态：数据库初始化失败"
    }
  } catch {
    Append-Log "数据库初始化异常：$($_.Exception.Message)"
    Set-Status "状态：数据库初始化异常"
  }
}

function Start-Workbench {
  if (Test-PortOpen) {
    Append-Log "端口 $port 已在监听，直接打开浏览器即可。"
    Refresh-State
    return
  }

  try {
    Initialize-Database
    Set-Status "状态：正在启动项目..."
    Append-Log "执行 npm run dev -- -p $port"

    $process = Start-Process `
      -FilePath "npm.cmd" `
      -ArgumentList "run", "dev", "--", "-p", "$port" `
      -WorkingDirectory $projectRoot `
      -WindowStyle Hidden `
      -RedirectStandardOutput $outLog `
      -RedirectStandardError $errLog `
      -PassThru

    Set-Content -LiteralPath $pidFile -Value $process.Id
    Start-Sleep -Seconds 4

    if (Test-PortOpen) {
      Append-Log "项目已启动：$url"
      Start-Process $url | Out-Null
    } else {
      Append-Log "启动命令已执行，但端口暂未监听。可稍等几秒后点击刷新状态。"
      if (Test-Path $errLog) {
        $lastError = Get-Content -LiteralPath $errLog -Tail 5 -ErrorAction SilentlyContinue
        if ($lastError) {
          Append-Log "错误日志：$($lastError -join ' ')"
        }
      }
    }
  } catch {
    Append-Log "启动失败：$($_.Exception.Message)"
  } finally {
    Refresh-State
  }
}

function Stop-Workbench {
  try {
    $serverProcess = Get-ServerProcess
    if ($serverProcess) {
      Stop-Process -Id $serverProcess.Id -Force
      Append-Log "已停止进程：$($serverProcess.Id)"
    } else {
      Append-Log "没有找到启动器记录的进程。"
    }

    if (Test-Path $pidFile) {
      Remove-Item -LiteralPath $pidFile -Force
    }
  } catch {
    Append-Log "停止失败：$($_.Exception.Message)"
  } finally {
    Start-Sleep -Seconds 1
    Refresh-State
  }
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "小红书电商 AI 专家工作台启动器"
$form.Size = New-Object System.Drawing.Size(620, 420)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "小红书电商 AI 专家工作台"
$titleLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 15, [System.Drawing.FontStyle]::Bold)
$titleLabel.AutoSize = $true
$titleLabel.Location = New-Object System.Drawing.Point(24, 22)
$form.Controls.Add($titleLabel)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "状态：检查中..."
$statusLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 10)
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object System.Drawing.Point(26, 62)
$form.Controls.Add($statusLabel)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = "启动项目"
$startButton.Size = New-Object System.Drawing.Size(120, 42)
$startButton.Location = New-Object System.Drawing.Point(28, 102)
$startButton.Add_Click({ Start-Workbench })
$form.Controls.Add($startButton)

$openButton = New-Object System.Windows.Forms.Button
$openButton.Text = "打开浏览器"
$openButton.Size = New-Object System.Drawing.Size(120, 42)
$openButton.Location = New-Object System.Drawing.Point(166, 102)
$openButton.Add_Click({ Start-Process $url | Out-Null })
$form.Controls.Add($openButton)

$initButton = New-Object System.Windows.Forms.Button
$initButton.Text = "初始化数据库"
$initButton.Size = New-Object System.Drawing.Size(120, 42)
$initButton.Location = New-Object System.Drawing.Point(304, 102)
$initButton.Add_Click({ Initialize-Database; Refresh-State })
$form.Controls.Add($initButton)

$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = "停止项目"
$stopButton.Size = New-Object System.Drawing.Size(120, 42)
$stopButton.Location = New-Object System.Drawing.Point(442, 102)
$stopButton.Add_Click({ Stop-Workbench })
$form.Controls.Add($stopButton)

$refreshButton = New-Object System.Windows.Forms.Button
$refreshButton.Text = "刷新状态"
$refreshButton.Size = New-Object System.Drawing.Size(120, 34)
$refreshButton.Location = New-Object System.Drawing.Point(28, 160)
$refreshButton.Add_Click({ Refresh-State; Append-Log "状态已刷新。" })
$form.Controls.Add($refreshButton)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ReadOnly = $true
$logBox.ScrollBars = "Vertical"
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$logBox.Location = New-Object System.Drawing.Point(28, 210)
$logBox.Size = New-Object System.Drawing.Size(534, 135)
$form.Controls.Add($logBox)

$hintLabel = New-Object System.Windows.Forms.Label
$hintLabel.Text = "提示：首次使用请先在 .env 中填写 OPENAI_API_KEY。"
$hintLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 9)
$hintLabel.AutoSize = $true
$hintLabel.Location = New-Object System.Drawing.Point(28, 354)
$form.Controls.Add($hintLabel)

Refresh-State
Append-Log "启动器已打开。"

[void]$form.ShowDialog()
