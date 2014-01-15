#!/bin/bash

. $(dirname $0)/included.sh

pscp-pl $(dirname $0)/worker.js /home/ustc_netstruct/crawler/worker.js
