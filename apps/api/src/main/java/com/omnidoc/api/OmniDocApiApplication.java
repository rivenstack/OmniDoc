package com.omnidoc.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
public class OmniDocApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(OmniDocApiApplication.class, args);
	}

}
