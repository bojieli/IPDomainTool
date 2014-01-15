#!/bin/bash

pssh_params="-l ustc_netstruct -h /home/v-bojli/planet-lab/all-hosts -O StrictHostKeyChecking=no -p 200"

function pssh-pl(){
    pssh $pssh_params "$@"
}
function pscp-pl(){
    pscp $pssh_params "$@"
}
