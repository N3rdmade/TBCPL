<p align="center">
      <img
        src="./public/logo.png"
        width="200"
        height="200"
      />
    </p>

# <p align="center">TBCPL</p>

Source Code of one of the most Demanding Indexing Site

## 
### How to add a new site? 
fork the repo do the edit and make a pull req

we'll take a look if its good then sure..


## License

[MIT](LICENSE)

## Socials

[Discord](https://discord.com/invite/BPxzYVY5UU)

## CI with CRON

```
chmod +x /root/TBCPL/ci.sh
```
```
(crontab -l 2>/dev/null; echo '* * * * * /root/TBCPL/ci.sh') | crontab -
```