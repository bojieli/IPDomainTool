#!/bin/bash

. $(dirname $0)/included.sh

pssh-pl "pkill node; cd crawler; nohup /home/ustc_netstruct/node-v0.10.24-linux-x86/bin/node worker.js >/dev/null &"
