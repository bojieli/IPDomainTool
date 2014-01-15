#!/bin/bash

. $(dirname $0)/included.sh

host="whois.freeshell.ustc.edu.cn"
name="node_modules.tar.gz"
name2="node-v0.10.24-linux-x86.tar.gz"
pssh-pl -t 0 "cd crawler; \
    rm -f $name; wget $host/$name -o $name; tar xf $name; rm -f $name; \
    cd ..; \
    rm -f $name2; wget $host/$name2 -o $name2; tar xf $name2; rm -f $name2"
